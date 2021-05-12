import Diagram from './components/Diagram';
import { useEffect, useState } from 'react';
import schema from './schema.json'

function App() {
  const [tables, setTables] = useState([])
  const [refs, setRefs] = useState([])


  useEffect(()=> {
    const refs = []

    const tables = Object.keys(schema).map(tableName => {
      const columnsObj = schema[tableName]
      return {
        id: tableName,
        name: tableName,
        columns: Object.keys(columnsObj).map(colName => {
          const col = columnsObj[colName]
          if (col.foreignKey) {
            refs.push({
              foreign: {
                table: tableName,
                column: colName
              },
              primary: {
                table: col.references,
                column: '_id'
              }
            })
          }
          return {
            name: colName,
            type: col.type
          }
        })
      }
    })

    setTables(tables)
    setRefs(refs)


  }, [])

  return <Diagram tables={tables} refs={refs}/>
}

export default App;
