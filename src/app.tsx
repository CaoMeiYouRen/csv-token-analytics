import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import CsvVizPage from "@/pages/CsvViz/CsvVizPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CsvVizPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
