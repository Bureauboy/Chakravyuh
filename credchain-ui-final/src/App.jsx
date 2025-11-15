import React from "react";
import Header from "./ui/Header";
import Issuer from "./pages/Issuer";
import Verifier from "./pages/Verifier";
import Wallet from "./pages/Wallet";
import LoginPage from "./ui/loginpage";
import { ConfigProvider } from "./utils/config";

export default function App() {
  const [page, setPage] = React.useState("login");

  return (
    <ConfigProvider>
      {page !== "login" && <Header onNav={setPage} />}

      {page === "login" && <LoginPage onSelect={setPage} />}
      {page === "issuer" && <Issuer />}
      {page === "verifier" && <Verifier />}
      {page === "student" && <Wallet />}
    </ConfigProvider>
  );
}
