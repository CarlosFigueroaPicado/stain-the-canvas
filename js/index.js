import { initHomeProductsUI } from "./modules/products/ui/home.js";
import { initPublicAdminNav } from "./modules/auth/ui/public-nav.js";

initHomeProductsUI();
initPublicAdminNav().catch((error) => {
	console.error("No se pudo inicializar menu admin en inicio:", error);
});
