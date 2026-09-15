/** Simplified Chinese names for official MD / AFCD features. */

export const FAIRWAY_NAMES: Record<string, string> = {
  "Ma Wan Fairway": "马湾航道",
  "Kap Shui Mun Fairway": "汲水门航道",
  "Castle Peak Fairway": "青山航道",
  "Urmston Road Fairway": "龙鼓水道航道",
  "Yau Ma Tei Fairway": "油麻地航道",
  "Western Fairway": "西部航道",
  "Southern Fairway": "南部航道",
  "Northern Fairway": "北部航道",
  "Hung Hom Fairway": "红磡航道",
  "Eastern Fairway": "东部航道",
  "Central Fairway": "中部航道",
  "Ha Pang Fairway": "虾兵航道",
  "North Green Island Fairway": "青洲北航道",
  "West Lamma Fairway": "南丫岛西航道",
  "South Shek Kwu Chau Fairway": "石鼓洲南航道",
  "Soko Fairway": "索罟航道",
  "East Lamma Channel Traffic Separation Scheme": "东博寮海峡分道通航制",
  "Tathong Channel Traffic Separation Scheme": "蓝塘海峡分道通航制",
  "Recommended Traffic Separation Scheme": "建议分道通航制",
};

export const SRZ_NAMES: Record<string, string> = {
  "K9 Sor Sze Mun": "K9 索罟门",
  "K8 Clear Water Bay": "K8 清水湾",
  "A9 Tung Wan": "A9 东湾",
  "T1 Plover Cove": "T1 船湾",
  "T2 Sha Tin Hoi": "T2 沙田海",
  "T4 Three Fathoms Cove": "T4 三门仔",
  "T5 Wu Kai Sha": "T5 乌溪沙",
  "T6 Sam Mun Tsai": "T6 三门仔",
  "K1 Tai She Wan": "K1 大蛇湾",
  "K2 Tsam Chuk Wan": "K2 斩竹湾",
  "K3 Hebe Haven (Pak Sha Wan)": "K3 白沙湾",
  "K4 East Kiu Tsui Chau": "K4 桥咀洲东",
  "K5 West Kau Sai Chau": "K5 滘西洲西",
  "K6 South Kau Sai Chau": "K6 滘西洲南",
  "K7 Bluff Island": "K7 扒头鼓",
  "K10 Ma Tau Wan": "K10 码头湾",
  "K11 High Island": "K11 粮船湾",
  "K12 Yeung Chau": "K12 洋洲",
  "A1 To Tei Wan": "A1 土地湾",
  "A2 Tai Tam Harbour": "A2 大潭港",
  "A3 Stanley Bay": "A3 赤柱湾",
  "A4 Chung Hom Wan": "A4 春坎湾",
  "A5 South Bay": "A5 南湾",
  "A6 Deep Water Bay": "A6 深水湾",
  "A7 Luk Chau Wan": "A7 鹿洲湾",
  "A10 Tai Tam Bay": "A10 大潭湾",
  "A11 Repulse Bay": "A11 浅水湾",
  "L1 Discovery Bay": "L1 愉景湾",
  "A8 Sham Wan": "A8 深湾",
  "T3 Ko Tong Hau": "T3 高塘口",
  "Zone C": "C区",
  "Zone B": "B区",
  "Zone A": "A区",
  "TS2 Aberdeen West Typhoon Shelter": "TS2 香港仔西避风塘",
  "TS11 Shuen Wan Typhoon Shelter": "TS11 船湾避风塘",
  "TS10 Shau Kei Wan Typhoon Shelter": "TS10 筲箕湾避风塘",
  "TS8 Rambler Channel Typhoon Shelter": "TS8 蓝巴勒海峡避风塘",
  "TS12 To Kwa Wan Typhoon Shelter": "TS12 土瓜湾避风塘",
  "TS4 Cheung Chau Typhoon Shelter": "TS4 长洲避风塘",
  "TS3 Causeway Bay Typhoon Shelter": "TS3 铜锣湾避风塘",
  "TS9 Sam Ka Tsuen Typhoon Shelter": "TS9 三家村避风塘",
  "TS6 Kwun Tong Typhoon Shelter": "TS6 观塘避风塘",
  "TS5 Hei Ling Chau Typhoon Shelter": "TS5 喜灵洲避风塘",
  "TS13 Tuen Mun Typhoon Shelter": "TS13 屯门避风塘",
  "TS14 Yim Tin Tsai Typhoon Shelter": "TS14 盐田仔避风塘",
  "TS1 Aberdeen South Typhoon Shelter": "TS1 香港仔南避风塘",
  "TS7 New Yau Ma Tei Typhoon Shelter": "TS7 新油麻地避风塘",
};

export function localizeName(en: string | null | undefined, map: Record<string, string>): string {
  if (!en) return "—";
  return map[en] || en;
}

export function classifySrz(inform: string | null | undefined, name: string | null | undefined): {
  key: string;
  label: string;
  color: string;
} {
  const text = `${inform || ""} ${name || ""}`.toLowerCase();
  if (name?.startsWith("TS") || text.includes("typhoon shelter")) {
    return { key: "shelter", label: "避风塘限速", color: "#7c5cff" };
  }
  if (name === "Zone C" || text.includes("15 knots")) {
    return { key: "15kt", label: "15 节 (Zone C)", color: "#ff9f1c" };
  }
  if (name === "Zone A" || name === "Zone B" || text.includes("overall length")) {
    return { key: "length", label: "按船长分级 (Zone A/B)", color: "#ef476f" };
  }
  if (text.includes("5 knots") || text.includes("5 节")) {
    return { key: "5kt", label: "5 节 (08:00–24:00)", color: "#06d6a0" };
  }
  return { key: "other", label: "其他限速", color: "#90be6d" };
}

export function isTss(name: string | null | undefined): boolean {
  return Boolean(name && /traffic separation|tss|分道/i.test(name));
}
