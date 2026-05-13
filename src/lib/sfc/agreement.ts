export type SfcAgreementItem = {
  id: string;
  title: string;
  ownerAsk: string;
  acceptance: string;
  status: "required" | "blocked" | "later";
};

export type SfcAgreementBrief = {
  todayGoal: string;
  officialReferences: Array<{
    label: string;
    url: string;
  }>;
  readOnlyActions: string[];
  requiredItems: SfcAgreementItem[];
  mutationBoundary: string[];
};

export function createSfcAgreementBrief(): SfcAgreementBrief {
  return {
    todayGoal: "SFC hesabını mutation yapmadan doğrula; depo, kargo metodu, stok ve fiyat smoke sonuçlarını al.",
    officialReferences: [
      {
        label: "SFC API overview",
        url: "https://api.sendfromchina.com/api",
      },
      {
        label: "SFC Warehouse Fulfillment Service API v3.1 PDF",
        url: "https://fulfill.sendfromchina.com/file/Cff-API-3.0.pdf",
      },
    ],
    readOnlyActions: ["getWarehouse", "getShippingMethod", "getStock", "getRate", "getRateByMode"],
    requiredItems: [
      {
        id: "api-access",
        title: "API erişimi",
        ownerAsk: "ODUN için API 3.0/3.1 erişimi, WSDL URL ve read-only test hesabı.",
        acceptance: "SFC_MODE=read_only ile smoke planı credentials hazır durumuna geçer.",
        status: "required",
      },
      {
        id: "credentials",
        title: "Credential seti",
        ownerAsk: "customerId, appToken ve appKey değerleri; sadece güvenli env alanına girilecek.",
        acceptance: "smoke:sfc-read-only-api raw SOAP body basmadan HTTP/SOAP özetleri üretir.",
        status: "required",
      },
      {
        id: "warehouse",
        title: "Warehouse aktivasyonu",
        ownerAsk: "ODUN origin warehouse ID ve aktivasyon durumunun yazılı teyidi.",
        acceptance: "getWarehouse ve getShippingMethod başarılı döner.",
        status: "required",
      },
      {
        id: "stock",
        title: "Stok ve SKU eşleşmesi",
        ownerAsk: "ODUN SKU kodları için stock lookup izinleri ve beklenen warehouse stock alanları.",
        acceptance: "getStock ODUN test SKU için credential echo veya SOAP fault olmadan özetlenir.",
        status: "required",
      },
      {
        id: "rates",
        title: "DDP/rate metotları",
        ownerAsk: "Asya DDP için approved shipping method code listesi ve rate parametreleri.",
        acceptance: "getRate/getRateByMode ülke, ağırlık ve ölçüyle başarılı döner.",
        status: "required",
      },
      {
        id: "mutations",
        title: "Mutation pilotu",
        ownerAsk: "createOrder/createASN/product mutation sadece ayrı pilot penceresinde ve owner onayıyla açılacak.",
        acceptance: "Bugünkü smoke sırasında SFC_ENABLE_MUTATIONS=false kalır.",
        status: "later",
      },
    ],
    mutationBoundary: [
      "Bugün createOrder çalıştırılmayacak.",
      "Bugün createASN çalıştırılmayacak.",
      "Bugün product create/update çalıştırılmayacak.",
      "Raw backer adresi SFC'ye sadece Asia DDP pilotunda ve ödeme kilidinden sonra gidebilir.",
    ],
  };
}
