import React from 'react'

export default function Header({onNav}){
  return (
    <header>
      <h2 style={{color:'white'}}>CredChain</h2>
      <nav>
        <button onClick={()=>onNav('issuer')}>Issuer</button>
        <button onClick={()=>onNav('verifier')}>Verifier</button>
        <button onClick={()=>onNav('wallet')}>Wallet</button>
      </nav>
    </header>
  )
}
