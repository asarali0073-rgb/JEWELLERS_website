export const money = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
export const shop = import.meta.env.VITE_SHOP_NAME || "AMIR JEWELLERS";
export const mapUrl = import.meta.env.VITE_SHOP_MAP_URL || "https://maps.google.com/";
export const address = import.meta.env.VITE_SHOP_ADDRESS || "Add verified shop address";
export const phone = import.meta.env.VITE_SHOP_PHONE || "Add business phone";
export const wa = import.meta.env.VITE_SHOP_WHATSAPP || "";
export const whatsappUrl = (message) => {
  const number = wa.replace(/\D/g, "");
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : "";
};
