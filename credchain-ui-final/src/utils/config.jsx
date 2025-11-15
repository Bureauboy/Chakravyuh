// src/utils/config.jsx
import React from 'react';

const cfg = {
  rpc: 'http://127.0.0.1:8545',
  issuerApi: 'http://localhost:4001',
  registryAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

const Ctx = React.createContext(cfg);

export const ConfigProvider = ({ children }) => (
  <Ctx.Provider value={cfg}>{children}</Ctx.Provider>
);

export const useConfig = () => React.useContext(Ctx);
