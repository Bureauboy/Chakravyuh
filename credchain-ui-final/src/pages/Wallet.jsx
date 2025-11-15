import React from 'react'
import { ethers } from 'ethers'
import { useConfig } from '../utils/config'
import abiJson from '../abi/CredentialRegistry.json'

export default function Wallet(){
  const cfg = useConfig()
  const [address, setAddress] = React.useState('')
  const [creds, setCreds] = React.useState([])

  async function connect(){
    const provider = new ethers.JsonRpcProvider(cfg.rpc)
    const signer = await provider.getSigner()
  }

  return (
    <div className='card'>
      <h3>Wallet Viewer</h3>
      <p>This is simplified for demo.</p>
    </div>
  )
}
