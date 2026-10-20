import { BrowserRouter, Routes, Route } from "react-router-dom";
import StandardsHome from "./pages/StandardsHome";
import NotFound from "./pages/NotFound";

/* The whole site is the standards app (src/standards). Lovable's query/tooltip/toast providers were unused and are
   left out so phones download less (Ryan 2026-10-14 "optimize everything"). */
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<StandardsHome />} />
      <Route path="/schools/:schoolSlug" element={<StandardsHome />} />
      <Route path="/onboarding" element={<StandardsHome />} />
      <Route path="/account" element={<StandardsHome />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
