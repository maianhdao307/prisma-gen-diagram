import Table from './Table';
import Draggable from 'react-draggable'
import { useEffect, useRef, useState } from 'react';
import Graph from 'node-dijkstra'
import {SVG} from '@svgdotjs/svg.js'
import { ROW_HEIGHT, TABLE_WIDTH } from '../constants';
import ELK from 'elkjs/lib/elk.bundled.js'

const distance = ([pointA, pointB]) => {
  const a = pointA.x - pointB.x
  const b = pointA.y - pointB.y

  return Math.sqrt(a * a + b * b)
}

const isPointInsideTable = ([x, y], tableId, containerId, draw) => {
  const parentRect = document
    .getElementById(containerId)
    .getBoundingClientRect()

  const tableRect = document.getElementById(tableId).getBoundingClientRect()

  const tableRelX = tableRect.x - parentRect.x - 10
  const tableRelY = tableRect.y - parentRect.y

  const width = tableRect.width + 20
  const height = tableRect.height

  const isIn =
    x >= tableRelX &&
    x <= tableRelX + width &&
    y >= tableRelY &&
    y <= tableRelY + height

  //draw.current.rect(width, height).fill("#afa").move(tableRelX, tableRelY);

  return isIn
}

const getPath = (from, to, canvasId, tableAId, tableBId, draw = null) => {
  const genGrid = (from, to, columns, rows) => {
    const points = {}
    const deltaX = (to.x - from.x) / columns
    const deltaY = (to.y - from.y) / rows

    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= columns; j++) {
        const node = {
          x: from.x + deltaX * j,
          y: from.y + deltaY * i,
          connections: {},
        }

        if (j < columns) {
          node.connections[`p${i}${j + 1}`] = 10
        }

        if (i < rows) {
          node.connections[`p${i + 1}${j}`] = 10
        }

        points[`p${i}${j}`] = node
      }
    }

    return points
  }

  
  const cols = 4
  const rows = 4
  const points = genGrid(from, to, cols, rows)


  points[`p${0}${0}`].connections[
    `p${0}${2}`
  ] = 1 /*TODO. look for non hardcoded way */
  points[`p${0}${2}`].connections[`p${4}${2}`] = 1
  points[`p${4}${2}`].connections[`p${4}${4}`] = 1
  points[`p${0}${2}`].connections[`p${4}${2}`] = 1

  points[`p${0}${0}`].connections[`p${0}${4}`] = 5
  points[`p${0}${4}`].connections[`p${4}${4}`] = 5

  points[`p${0}${0}`].connections[`p${4}${0}`] = 5
  points[`p${4}${0}`].connections[`p${4}${4}`] = 5

  const route = new Graph()

  Object.entries(points).forEach(([key, p]) => {
    //draw.current.circle(4).move(p.x, p.y).fill("#a00");
    if (key !== 'to') {
      if (
        isPointInsideTable([p.x, p.y], tableAId, canvasId, draw) ||
        isPointInsideTable([p.x, p.y], tableBId, canvasId, draw)
      ) {
        return
      }
      route.addNode(key, p.connections)
    }
  })

  const sPath = route.path(`p${0}${0}`, `p${cols}${rows}`)

  if (!sPath) {
    return [
      ['M', from.x, from.y],
      ['L', to.x, to.y],
    ]
  }

  return sPath.map((p, i) => {
    if (i === 0) return ['M', points[p].x, points[p].y]
    return ['L', points[p].x, points[p].y]
  })
}

const ArrToSvgPath = (arr) => {
  return arr.flat().join(' ')
}

const arrangeItems = async (tables, refs) => {
  const elk = new ELK()
  const tableCoords = {}

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.padding': '[top=25,left=25,bottom=25,right=25]',
      'elk.spacing.componentComponent': 25, // unconnected nodes are individual subgraphs, referred to as named components
      'elk.layered.spacing.nodeNodeBetweenLayers': 40, // this has effect, but only if there are edges.
      'elk.edgeLabels.inline': true,
    },
    children: tables.map(({name, columns}) => {
      return {
        id: `table_${name}`,
        width: TABLE_WIDTH,
        height: ROW_HEIGHT * (columns.length + 1),
      }
    }),
    edges: refs.map(({foreign, primary}) => {
      const id = `table_${foreign.table}_table_${primary.table}`
      const source = `table_${foreign.table}`
      const target = `table_${primary.table}`
      return {
        id,
        sources: [source],
        targets: [target],
      }
    }),
  }

  const elkResponse = await elk.layout(graph)
  elkResponse.children.forEach((node) => {
    tableCoords[node.id] = {
      x: node.x,
      y: node.y,
    }
  })

  const tablePosData = tables.map((table) => {
    return {
      id: `table_${table.name}`,
      ...table,
      ...tableCoords[`table_${table.name}`],
    }
  })

  return {
    tables: tablePosData,
    width: elkResponse.width,
    height: elkResponse.height,
  }
}

let timeout;

function Diagram({ tables: initialTables, refs }) {
  const [tables, setTables] = useState(initialTables)
  const [columnPoints, setColumnPoints] = useState([])
  const [canvasSize, setCanvasSize] = useState({})
  const draw = useRef(null)

  useEffect(() => {
    if (!draw.current) {
      draw.current = SVG().addTo('#draggables').size('100%', '100%')
    }

    arrangeItems(initialTables, refs).then(response => {
      setTables(response.tables)
      setCanvasSize({
        width: response.width,
        height: response.height
      })
    })
  }, [initialTables, refs])

  useEffect(() => {
    if (!columnPoints.length) {
      return null
    }
    const points = columnPoints.reduce((obj, point) => ({
      ...obj,
      [point.key]: point
    }), {})

    refs.forEach(({foreign, primary}) => {
      const colForeignId = `column_${foreign.table}_${foreign.column}`
      const colPrimaryId = `column_${primary.table}_${primary.column}`

      const colForeign = points[colForeignId]
      const colPrimary = points[colPrimaryId]

      const segments = [
        [colForeign.left, colPrimary.left],
        [colForeign.left, colPrimary.right],
        [colForeign.right, colPrimary.left],
        [colForeign.right, colPrimary.right],
      ].sort((segmentA, segmentB) => {
        return distance(segmentA) - distance(segmentB)
      })

      const shortest = segments[0]
      const from = shortest[0]
      const to = shortest[1]

      const path = getPath(
        from,
        to,
        `canvas`,
        `table_${foreign.table}`,
        `table_${primary.table}`,
        draw
      )

      path.push(['M', from.x, from.y])
      path.push(['L', colForeign.center.x, colForeign.center.y])
      path.push(['M', to.x, to.y])
      path.push(['L', colPrimary.center.x, colPrimary.center.y])

      const element = draw.current
        .path(ArrToSvgPath(path))
        .stroke({color: '#cbcbcb', width: 2})
        .fill('none')

      element.on(['mouseover'], (e) => {
        element.stroke({color: '#7e7e7e', width: 2})
        document.getElementById(colForeignId).classList.add('hover')
        document.getElementById(colPrimaryId).classList.add('hover')
      })

      element.on(['mouseout'], (e) => {
        element.stroke({color: '#cbcbcb', width: 2})
        document.getElementById(colForeignId).classList.remove('hover')
        document.getElementById(colPrimaryId).classList.remove('hover')
      })
    })
  }, [columnPoints, refs])

  useEffect(() => {
    const columns = tables.flatMap((table) => {
      return table.columns.map((column) => {
        const key = `column_${table.name}_${column.name}`
        const el = document.getElementById(key)
        const parent = document.getElementById('canvas')

        const parentX = window.scrollX + parent.getBoundingClientRect().left
        const parentY = window.scrollY + parent.getBoundingClientRect().top

        const elX = window.scrollX + el.getBoundingClientRect().left
        const elY = window.scrollY + el.getBoundingClientRect().top

        const x = Math.ceil(elX - parentX + TABLE_WIDTH / 2)
        const y = Math.ceil(elY - parentY + ROW_HEIGHT / 2)

        /*
        draw.current
          .circle(4)
          .move(x - 100, y)
          .fill("#faa");
        draw.current
          .circle(4)
          .move(x + 100, y)
          .fill("#aaf");
          */

        return {
          name: column.name,
          table: table.name,
          key,
          center: {x, y},
          left: {x: x - TABLE_WIDTH / 2 - 20, y},
          right: {
            x: x + TABLE_WIDTH / 2 + 20,
            y,
          },
        }
      })
    })

    setColumnPoints(columns)

    return () => {
      draw.current.clear()
    }
  }, [tables])

  const handleDrag = ({data, table}) => {
    const tableIndex = tables.findIndex(t => t.name === table.name)
    const newTables = [...tables]
    newTables[tableIndex] = {
      ...newTables[tableIndex],
      x: data.x,
      y: data.y
    }
    cancelAnimationFrame(timeout);
    timeout = requestAnimationFrame(() => {
      setTables(newTables)
    })
  }

  return (
    <div className='w-screen h-screen overflow-auto'>

    <div
      id="canvas"
      className="relative w-full h-full"
      style={{
        minHeight: canvasSize.height,
        minWidth: canvasSize.width
      }}
    >
      <div 
        className="w-full h-full absolute top-0 left-0"
        id="draggables"
      >
        {tables.length > 0 &&
          tables.map((table) => {
            return (
              <Draggable
                bounds="parent"
                key={`table_${table.name}`}
                defaultPosition={{x: 0, y: 0}}
                handle=".handle"
                position={{x: table.x || 0, y: table.y || 0}}
                onStart={(e) => {}}
                onDrag={(e, data) => {
                  handleDrag({e, data, table})
                }}
                onStop={() => {}}
              >
                <div
                  style={{position: 'absolute', top: 0, left: 0}}
                  className="handle"
                >
                  <Table id={`table_${table.name}`} table={table}/>
                </div>
              </Draggable>
            )
          })}
      </div>
    </div>
    </div>

  )
}

export default Diagram;
