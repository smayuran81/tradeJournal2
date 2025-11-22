import { useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { Box } from '@mui/material'

export default function TickerGrid({ rowData = [], onSelect }) {

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    flex: 1,
  }), [])

  const columnDefs = useMemo(
    () => [
      { field: 'pair', headerName: 'Pair', cellClass: 'cell-pair', minWidth: 160, flex: 2 },
      { field: 'bid', headerName: 'Bid', cellClass: 'cell-bid', minWidth: 140, flex: 1 },
      { field: 'ask', headerName: 'Ask', cellClass: 'cell-ask', minWidth: 140, flex: 1 },
    ],
    []
  )

  const onSelectionChanged = useCallback((params) => {
    const sel = params.api.getSelectedRows()[0] || null
    if (onSelect) {
      setTimeout(() => onSelect(sel), 0)
    }
  }, [onSelect])

  return (
    <Box sx={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }} className="ag-theme-alpine">
      <AgGridReact
        rowData={rowData}
        defaultColDef={defaultColDef}
        columnDefs={columnDefs}
        rowSelection="single"
        onSelectionChanged={onSelectionChanged}
        animateRows={false}
        suppressAnimationFrame={true}
        suppressReactUi={true}
        rowHeight={38}
        headerHeight={36}
        suppressRowClickSelection={false}
      />
    </Box>
  )
}
