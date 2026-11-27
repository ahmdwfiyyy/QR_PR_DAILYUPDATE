import type { ReactNode } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Banner, EmptyState, Loading, redBtn } from "./components/ui";
import { useSnapshots } from "./context/SnapshotContext";
import DashboardPage from "./pages/DashboardPage";
import DatasetPage from "./pages/DatasetPage";
import TrendPage from "./pages/TrendPage";
import UploadPage from "./pages/UploadPage";

/** Pages that need at least one upload; until then they point to the Upload page. */
function RequireData({ children }: { children: ReactNode }) {
  const { days, loading, error } = useSnapshots();
  if (loading) return <Loading />;
  if (error) return <Banner notice={{ type: "error", text: error }} />;
  if (days.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        text="Upload today's PR and QR files to get started."
        action={
          <Link to="/upload" className={redBtn}>
            Go to Upload
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RequireData><DashboardPage /></RequireData>} />
        <Route path="/pr" element={<RequireData><DatasetPage key="PR" dataset="PR" /></RequireData>} />
        <Route path="/qr/update" element={<RequireData><DatasetPage key="BU" dataset="BU" /></RequireData>} />
        <Route path="/qr/verify" element={<RequireData><DatasetPage key="BV" dataset="BV" /></RequireData>} />
        <Route path="/trend" element={<RequireData><TrendPage /></RequireData>} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="*" element={<EmptyState title="Page not found" text="Use the menu above to find your way back." />} />
      </Route>
    </Routes>
  );
}
