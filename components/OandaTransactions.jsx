import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'

const AgGridReact = dynamic(() => import('ag-grid-react').then(m => m?.AgGridReact || m?.default), { ssr: false })

export default function OandaTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching transactions...')
      const response = await fetch('/api/oanda/transactions')
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch transactions')
      }
      
      const data = await response.json()
      console.log('Received data:', data)
      
      if (!data.transactions || data.transactions.length === 0) {
        setTransactions([])
        setError('No transactions found for this account')
      } else {
        setTransactions(data.transactions || [])
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const columnDefs = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'instrument', headerName: 'Instrument', width: 100 },
    { field: 'units', headerName: 'Units', width: 100, valueFormatter: params => params.value ? Number(params.value).toLocaleString() : '' },
    { field: 'price', headerName: 'Price', width: 100 },
    { field: 'pl', headerName: 'P&L', width: 100, cellStyle: params => ({ color: params.value > 0 ? '#00C48C' : params.value < 0 ? '#F95F62' : '#1E1F26' }) },
    { field: 'time', headerName: 'Time', width: 180, valueFormatter: params => params.value ? new Date(params.value).toLocaleString() : '' }
  ], [])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true
  }), [])

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div>Loading Oanda transactions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: error.includes('No transactions found') ? '#F59E0B' : '#F95F62' }}>
        <div>{error}</div>
        <button onClick={fetchTransactions} style={{ marginTop: 10, padding: '8px 16px', background: '#365CFD', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: 400, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#1E1F26' }}>Oanda Transactions</h3>
        <button onClick={fetchTransactions} style={{ padding: '8px 16px', background: '#365CFD', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
      {transactions.length > 0 ? (
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
          <AgGridReact
            rowData={transactions}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
          />
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>No Transactions Found</div>
          <div>This account has no transactions.</div>
          <div style={{ marginTop: 12, fontSize: 14 }}>Try making some trades first or check a different time range.</div>
        </div>
      )}
    </div>
  )
}