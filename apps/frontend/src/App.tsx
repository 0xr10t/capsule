import { Layout } from "./components/Layout";
import { Marketplace } from "./components/Marketplace";
import { Upload } from "./components/Upload";
import { Viewer } from "./components/Viewer";
import { Explorer } from "./components/Explorer";
import { useCapsuleStore } from "./lib/store";

export function App() {
  const page = useCapsuleStore((state) => state.page);
  return (
    <Layout>
      {page === "marketplace" && <Marketplace />}
      {page === "upload" && <Upload />}
      {page === "viewer" && <Viewer />}
      {page === "explorer" && <Explorer />}
    </Layout>
  );
}

