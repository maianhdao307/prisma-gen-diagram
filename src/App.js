import Diagram from './components/Diagram';

function App() {
  const tables = [
    {
      id: 'table_Product',
      name: 'Product',
      columns: [
        {
          name: 'id',
          type: 'string'
        },
        {
          name: 'name',
          type: 'string'
        },
        {
          name: 'categoryId',
          type: 'string'
        }
      ]
    },
    {
      id: 'table_Category',
      name: 'Category',
      columns: [
        {
          name: 'id',
          type: 'string'
        },
        {
          name: 'name',
          type: 'string'
        },
      ]
    }
  ]

  const refs = [
    {
      foreign: {
        table: 'Product',
        column: 'categoryId'
      },
      primary: {
        table: 'Category',
        column: 'id'
      }
    }
  ]

  return <Diagram tables={tables} refs={refs}/>
}

export default App;
