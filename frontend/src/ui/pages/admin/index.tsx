import { Navigate } from "react-router-dom";
import { Paths } from "../../navigation/paths";

/** `/admin` in admin branch. */
export function AdminIndexRedirect() {
  return <Navigate to={Paths.adminStatistics} replace />;
}

