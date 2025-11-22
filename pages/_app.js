import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import '../styles/globals.css'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import 'react-quill/dist/quill.snow.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2b6ef6',
      light: '#4f7bff',
      dark: '#1a4fd4',
    },
    secondary: {
      main: '#556274',
    },
    success: {
      main: '#0f9d58',
    },
    warning: {
      main: '#ffb86b',
    },
    error: {
      main: '#d23f3f',
    },
    background: {
      default: '#ffffff',
      paper: '#f6f8fb',
    },
    text: {
      primary: '#0f1724',
      secondary: '#556274',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 700,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.45,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(15,23,36,0.06)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(15,23,36,0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(15,23,36,0.04)',
        },
      },
    },
  },
})

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
