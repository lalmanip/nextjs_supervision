import { http } from "@/services/http/client";
import { attachGlobalInterceptors } from "@/services/http/interceptors";

attachGlobalInterceptors(http);

export { http };

