import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function SignIn({ providers }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getSession().then(session => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSignIn = async (providerId) => {
    setLoading(true)
    await signIn(providerId, { callbackUrl: '/' })
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}}>
      <div style={{background:'white',padding:40,borderRadius:12,boxShadow:'0 10px 25px rgba(0,0,0,0.1)',maxWidth:400,width:'100%'}}>
        <h1 style={{textAlign:'center',marginBottom:30,color:'#1f2937'}}>Trading Journal</h1>
        <p style={{textAlign:'center',color:'#6b7280',marginBottom:30}}>Sign in to access your trading data</p>
        
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {Object.values(providers).map((provider) => (
            <button
              key={provider.name}
              onClick={() => handleSignIn(provider.id)}
              disabled={loading}
              style={{
                padding:'12px 20px',
                border:'1px solid #d1d5db',
                borderRadius:8,
                background:'white',
                cursor:loading ? 'not-allowed' : 'pointer',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:8,
                fontSize:16,
                fontWeight:500,
                opacity:loading ? 0.6 : 1
              }}
            >
              {provider.name === 'GitHub' && '🐙'}
              {provider.name === 'Google' && '🔍'}
              Sign in with {provider.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  const providers = await getProviders()
  return {
    props: { providers },
  }
}