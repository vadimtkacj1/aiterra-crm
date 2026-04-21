import { Navigate } from "react-router-dom";
import { Paths } from "../navigation/paths";

/** Legacy route `/takanon` → redirect to `/terms`. */
export function TakanonRedirect() {
  return <Navigate to={Paths.terms} replace />;
}

