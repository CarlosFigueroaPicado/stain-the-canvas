import { initCatalogProductsUI } from "./modules/products/ui/catalog.js";
import { initPublicAdminNav } from "./modules/auth/ui/public-nav.js";

initCatalogProductsUI();
initPublicAdminNav().catch((error) => {
	console.error("No se pudo inicializar menú admin en catálogo:", error);
});
