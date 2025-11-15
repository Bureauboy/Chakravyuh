import React from 'react'
import Header from './ui/Header'
import Issuer from './pages/Issuer'
import Verifier from './pages/Verifier'
import Wallet from './pages/Wallet'
import { ConfigProvider } from './utils/config'

export default function App(){
  const [page, setPage] = React.useState('issuer')
  return (
    <ConfigProvider>
      <Header onNav={setPage}/>
      {page === 'issuer' && <Issuer/>}
      {page === 'verifier' && <Verifier/>}
      {page === 'wallet' && <Wallet/>}
    </ConfigProvider>
  )
}
