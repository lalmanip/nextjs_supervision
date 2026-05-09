import { Suspense } from "react";
import LoginClient from "./widgets/login-client";

export default function SupervisionLoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}

