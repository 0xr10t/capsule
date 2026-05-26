import "@mysten/dapp-kit/dist/index.css";
import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const { networkConfig } = createNetworkConfig({
  testnet: { network: "testnet", url: getJsonRpcFullnodeUrl("testnet") },
  mainnet: { network: "mainnet", url: getJsonRpcFullnodeUrl("mainnet") },
});
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
