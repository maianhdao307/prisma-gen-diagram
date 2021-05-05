import React from 'react'
import { ROW_HEIGHT, TABLE_WIDTH } from './constants'

export default function Table({table}) {
  const {name, columns} = table
  
  const getType = ({type, size = null}) => {
    const sizeDefinition = size ? `(${size})` : ''
    return `${type} ${sizeDefinition}`
  }

  return (
    <div id={`table_${name}`} className="w[175] overflow-hidden" style={{width: TABLE_WIDTH}}>
      <table border="0" cellPadding="0" cellSpacing="0" className="border-collapse border border-blue-100 w-full bg-white">
        <thead>
          <tr>
            <td className="border border-blue-500 text-center bg-blue-500 text-white px-2" style={{height: ROW_HEIGHT}}>
              <span className="">{name}</span>
            </td>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => {
            return (
              <tr key={`${name}_${column.name}`}>
                <td className="border border-blue-500 px-2" style={{height: ROW_HEIGHT}}>
                  <div
                    id={`column_${name}_${column.name}`}
                    className="flex justify-between items-center"
                  >
                    <span className="">{column.name}</span>
                    <small className="">
                      {getType(column)}
                    </small>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
