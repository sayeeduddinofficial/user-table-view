import { useEffect, useRef, useState } from "react";
import { ConnectorOverlay, type Connection } from "./ConnectorOverlay";

type ResourcesMode = "vpc-only" | "vpc-and-more";
type NatMode = "none" | "regional" | "zonal";
type NatUpdatedMode = "in1az" | "oneperaz";
type EndpointsMode = "none" | "s3";

/* ---------- Preview panel ---------- */
export function PreviewPanel({
  baseName,
  azs,
  publicCount,
  privateCount,
  nat,
  natUpdated,
  autoGen,
  mode,
  endpoints,
  ipv4Cidr,
  subnetCidrs,
  customSubnetCidrs,
}: {
  baseName: string;
  azs: string[];
  publicCount: number;
  privateCount: number;
  nat: NatMode;
  natUpdated: NatUpdatedMode;
  autoGen: boolean;
  mode: ResourcesMode;
  endpoints: EndpointsMode;
  ipv4Cidr: string;
  subnetCidrs: { label: string; cidr: string; kind: "public" | "private" }[];
  customSubnetCidrs: Record<string, string>;
}) {
  const [hoveredItem, setHoveredItem] = useState<string>("none");
  const diagramRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setBoxRef = (key: string) => (el: HTMLDivElement | null) => {
    boxRefs.current[key] = el;
  };

  const isVpcOnly = mode === "vpc-only";

  const subnetCidrByKey: Record<string, string> = {};
  subnetCidrs.forEach((s, i) => {
    const value = customSubnetCidrs[s.label] ?? s.cidr;
    const key = i < publicCount ? `public-${i}` : `private-${i - publicCount}`;
    subnetCidrByKey[key] = value;
  });

  const natCount = !isVpcOnly && nat === "zonal"
    ? (natUpdated === "in1az" ? 1 : azs.length)
    : 0;

  const totalSubnets = isVpcOnly ? 0 : (publicCount + privateCount);
  const routeTablesCount = isVpcOnly ? 0 : ((publicCount > 0 ? 1 : 0) + privateCount);
  const networkConnectionsCount = isVpcOnly
    ? 1
    : (publicCount > 0 ? 1 : 0) + (endpoints === "s3" ? 1 : 0) + natCount;

  const [vpcCustomName, setVpcCustomName] = useState("");
  const [subCustomNames, setSubCustomNames] = useState<Record<string, string>>({});
  const [rtbCustomNames, setRtbCustomNames] = useState<Record<string, string>>({});
  const [netCustomNames, setNetCustomNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (autoGen) {
      setVpcCustomName("");
      setSubCustomNames({});
      setRtbCustomNames({});
      setNetCustomNames({});
    }
  }, [autoGen, baseName]);

  const azLayouts = isVpcOnly ? [] : azs.map((az, azIdx) => {
    const subnetsInThisAz: { kind: "public" | "private"; label: string; key: string; rtbKey: string }[] = [];
    
    if (azIdx < publicCount) {
      const defaultLabel = `${baseName}-subnet-public${azIdx + 1}`;
      const subKey = `public-${azIdx}`;
      subnetsInThisAz.push({ 
        kind: "public", 
        label: autoGen ? defaultLabel : (subCustomNames[subKey] || `Public subnet ${azIdx + 1}`),
        key: subKey,
        rtbKey: "rtb-public"
      });
    }
    
    const perAzPrivate = Math.ceil(privateCount / Math.max(1, azs.length));
    for (let p = 0; p < perAzPrivate; p++) {
      const currentPrivateIdx = azIdx + 1 + p * azs.length;
      if (currentPrivateIdx <= privateCount) {
        const defaultLabel = `${baseName}-subnet-private${currentPrivateIdx}`;
        const subKey = `private-${currentPrivateIdx - 1}`;
        subnetsInThisAz.push({ 
          kind: "private", 
          label: autoGen ? defaultLabel : (subCustomNames[subKey] || `Private subnet ${currentPrivateIdx}`),
          key: subKey,
          rtbKey: `rtb-private-${currentPrivateIdx - 1}`
        });
      }
    }

    return { az, items: subnetsInThisAz };
  });

  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-5 overflow-x-auto select-none">
      <div className="min-w-[900px] border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-950 p-6 shadow-sm space-y-8">
        <div ref={diagramRef} className="grid grid-cols-[1fr_1.3fr_1.1fr_1.1fr] gap-6 items-start relative">
          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              VPC (1)
            </div>
            <div 
              ref={setBoxRef("vpc")}
              onMouseEnter={() => setHoveredItem("all")}
              onMouseLeave={() => setHoveredItem("none")}
              className={`border-2 rounded-lg p-4 pt-7 relative shadow-sm min-h-[100px] cursor-pointer transition-all duration-200 ${
                hoveredItem !== "none"
                  ? "border-blue-500 bg-blue-50/10 dark:bg-blue-500/5 ring-4 ring-blue-500/10 opacity-100 scale-[1.01]"
                  : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="absolute top-2 left-3 text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[92%]">
                {vpcCustomName || `${baseName}-vpc`}
              </div>
              <div className="text-xs text-neutral-500 font-mono">{ipv4Cidr || "10.0.0.0/16"}</div>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Subnets ({totalSubnets})
            </div>

            {totalSubnets === 0 ? (
              <div className="text-xs text-neutral-400 italic p-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/50">
                No subnets generated
              </div>
            ) : (
              <div className="space-y-4">
                {azLayouts.map((azBox) => {
                  if (azBox.items.length === 0) return null;
                  return (
                    <div
                      key={azBox.az}
                      className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-3 pt-6 relative bg-neutral-50 dark:bg-neutral-900/30"
                    >
                      <div className="absolute top-1.5 left-3 text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                        AZ: {azBox.az}
                      </div>
                      <div className="space-y-2.5">
                        {azBox.items.map((sub, sIdx) => {
                          const isPublic = sub.kind === "public";
                          const isCardActive =
                            hoveredItem === "all" ||
                            hoveredItem === sub.key ||
                            hoveredItem === sub.rtbKey ||
                            (isPublic && hoveredItem === "igw") ||
                            (!isPublic && hoveredItem === "vpce") ||
                            (!isPublic && nat === "zonal" && (() => {
                              const m = sub.key.match(/^private-(\d+)$/);
                              if (!m) return false;
                              const idx = parseInt(m[1], 10);
                              const natIdx = natUpdated === "in1az" ? 0 : (idx % Math.max(1, azs.length));
                              return hoveredItem === `nat-${natIdx}`;
                            })());

                          return (
                            <div
                              key={sIdx}
                              ref={setBoxRef(sub.key)}
                              onMouseEnter={() => setHoveredItem(sub.key)}
                              onMouseLeave={() => setHoveredItem("none")}
                              className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                                isPublic
                                  ? isCardActive
                                    ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 opacity-100 scale-[1.01]"
                                    : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                                  : isCardActive
                                    ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                                    : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                              }`}
                            >
                              <div className={`absolute top-1 left-2.5 text-[9px] font-mono font-bold tracking-wide ${
                                isCardActive 
                                  ? isPublic ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                  : "text-neutral-400"
                              }`}>
                                {sub.label}
                              </div>
                              <div className="text-xs text-neutral-400 font-mono">{subnetCidrByKey[sub.key] || "10.0.X.0/24"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Route Tables ({routeTablesCount})
            </div>

            {routeTablesCount === 0 ? (
              <div className="text-xs text-neutral-400 italic p-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/50">
                No custom route tables
              </div>
            ) : (
              <div className="space-y-3">
                {!isVpcOnly && publicCount > 0 && (
                  <div
                    ref={setBoxRef("rtb-public")}
                    onMouseEnter={() => setHoveredItem("rtb-public")}
                    onMouseLeave={() => setHoveredItem("none")}
                    className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                      hoveredItem === "all" || hoveredItem === "rtb-public" || hoveredItem === "igw" || (hoveredItem.startsWith("public-"))
                        ? "border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 opacity-100 scale-[1.01]"
                        : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                      {rtbCustomNames["public"] || `${baseName}-rtb-public`}
                    </div>
                    <div className="text-xs text-neutral-500 font-medium">1 local, 1 IGW route</div>
                  </div>
                )}

                {!isVpcOnly && Array.from({ length: privateCount }).map((_, i) => {
                  const currentRtbKey = `rtb-private-${i}`;
                  const matchingSubnetKey = `private-${i}`;
                  const isRtbActive =
                    hoveredItem === "all" ||
                    hoveredItem === currentRtbKey ||
                    hoveredItem === matchingSubnetKey ||
                    hoveredItem === "vpce" ||
                    (nat === "zonal" && (() => {
                      const natIdx = natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
                      return hoveredItem === `nat-${natIdx}`;
                    })());

                  return (
                    <div
                      key={i}
                      ref={setBoxRef(currentRtbKey)}
                      onMouseEnter={() => setHoveredItem(currentRtbKey)}
                      onMouseLeave={() => setHoveredItem("none")}
                      className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                        isRtbActive
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                          : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                      }`}
                    >
                      <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400 truncate max-w-[92%]">
                        {rtbCustomNames[`private-${i}`] || `${baseName}-rtb-private${i + 1}`}
                      </div>
                      <div className="text-xs text-neutral-500 font-medium">
                        {nat !== "none" ? "1 local, 1 NAT route" : "1 local route"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 relative z-10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono px-1">
              Network Connections ({networkConnectionsCount})
            </div>

            <div className="space-y-3">
              {!isVpcOnly && publicCount > 0 && (
                <div
                  ref={setBoxRef("igw")}
                  onMouseEnter={() => setHoveredItem("igw")}
                  onMouseLeave={() => setHoveredItem("none")}
                  className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                    hoveredItem === "all" || hoveredItem === "igw" || hoveredItem === "rtb-public" || hoveredItem.startsWith("public-")
                      ? "border-purple-600 bg-purple-50 text-purple-700 dark:text-purple-400 opacity-100 scale-[1.01]"
                      : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                    {netCustomNames["igw"] || `${baseName}-igw`}
                  </div>
                  <div className="text-xs font-semibold">Internet Gateway</div>
                </div>
              )}

              {endpoints === "s3" && (
                <div
                  ref={setBoxRef("vpce")}
                  onMouseEnter={() => setHoveredItem("vpce")}
                  onMouseLeave={() => setHoveredItem("none")}
                  className={`border rounded-lg p-3 pt-5 relative bg-white transition-all duration-150 shadow-sm cursor-pointer ${
                    hoveredItem === "all" || hoveredItem === "vpce" || hoveredItem.startsWith("rtb-private-") || hoveredItem.startsWith("private-")
                      ? "border-neutral-700 text-neutral-800 dark:text-neutral-200 opacity-100 scale-[1.01]"
                      : "border-neutral-300 dark:border-neutral-700 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400">
                    {netCustomNames["vpce"] || "S3 Gateway Endpoint"}
                  </div>
                  <div className="text-xs font-medium text-neutral-500">VPC endpoint</div>
                </div>
              )}

              {!isVpcOnly && nat === "zonal" && Array.from({ length: natCount }).map((_, i) => {
                const natKey = `nat-${i}`;
                const azLabel = azs[i] ?? azs[0];
                const natName = `${baseName}-nat-public${i + 1}-${azLabel}`;
                const isActive =
                  hoveredItem === "all" ||
                  hoveredItem === natKey ||
                  (natUpdated === "in1az" && (hoveredItem.startsWith("rtb-private-") || hoveredItem.startsWith("private-"))) ||
                  (natUpdated === "oneperaz" && (() => {
                    const m = hoveredItem.match(/^(?:rtb-)?private-(\d+)$/);
                    if (!m) return false;
                    const idx = parseInt(m[1], 10);
                    return idx % Math.max(1, azs.length) === i;
                  })());
                return (
                  <div
                    key={natKey}
                    ref={setBoxRef(natKey)}
                    onMouseEnter={() => setHoveredItem(natKey)}
                    onMouseLeave={() => setHoveredItem("none")}
                    className={`border rounded-lg p-3 pt-5 relative cursor-pointer transition-all duration-150 shadow-sm ${
                      isActive
                        ? "border-blue-600 bg-blue-50/80 dark:bg-blue-600/10 opacity-100 scale-[1.01]"
                        : "border-neutral-300 dark:border-neutral-700 bg-white opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute top-1 left-2.5 text-[9px] font-mono font-bold text-neutral-400 truncate max-w-[92%]">
                      {natName}
                    </div>
                    <div className="text-xs font-medium text-neutral-500">NAT Gateway</div>
                  </div>
                );
              })}
            </div>
          </div>

          <ConnectorOverlay
            containerRef={diagramRef}
            boxRefs={boxRefs}
            hovered={hoveredItem === "none" ? null : hoveredItem}
            connections={(() => {
              const conns: Connection[] = [];
              const allSubs = azLayouts.flatMap((a) => a.items);
              const natIdxFor = (i: number) =>
                natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
              for (const s of allSubs) {
                const extraKeys: string[] = [];
                if (s.kind === "public") extraKeys.push("igw", "rtb-public");
                else {
                  const m = s.key.match(/^private-(\d+)$/);
                  if (m) {
                    const idx = parseInt(m[1], 10);
                    if (endpoints === "s3") extraKeys.push("vpce");
                    if (nat === "zonal" && natCount > 0) extraKeys.push(`nat-${natIdxFor(idx)}`);
                  }
                }
                conns.push({ from: "vpc", to: s.key, keys: ["all", s.key, s.rtbKey, ...extraKeys] });
                conns.push({
                  from: s.key,
                  to: s.rtbKey,
                  keys: ["all", s.key, s.rtbKey, ...extraKeys],
                });
              }
              if (!isVpcOnly && publicCount > 0) {
                conns.push({
                  from: "rtb-public",
                  to: "igw",
                  keys: ["all", "rtb-public", "igw", ...allSubs.filter((s) => s.kind === "public").map((s) => s.key)],
                });
              }
              if (endpoints === "s3") {
                for (let i = 0; i < privateCount; i++) {
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: "vpce",
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, "vpce"],
                  });
                }
              }
              if (!isVpcOnly && nat === "zonal" && natCount > 0) {
                for (let i = 0; i < privateCount; i++) {
                  const natIdx = natIdxFor(i);
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: `nat-${natIdx}`,
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, `nat-${natIdx}`],
                  });
                }
              }
              return conns;
            })()}
            deps={[azLayouts.length, publicCount, privateCount, endpoints, isVpcOnly, autoGen, nat, natUpdated, natCount]}
          />

          <ConnectorOverlay
            containerRef={diagramRef}
            boxRefs={boxRefs}
            hovered={hoveredItem === "none" ? null : hoveredItem}
            connections={(() => {
              const conns: Connection[] = [];
              const allSubs = azLayouts.flatMap((a) => a.items);
              const natIdxFor = (i: number) =>
                natUpdated === "in1az" ? 0 : (i % Math.max(1, azs.length));
              for (const s of allSubs) {
                const extraKeys: string[] = [];
                if (s.kind === "public") extraKeys.push("igw", "rtb-public");
                else {
                  const m = s.key.match(/^private-(\d+)$/);
                  if (m) {
                    const idx = parseInt(m[1], 10);
                    if (endpoints === "s3") extraKeys.push("vpce");
                    if (nat === "zonal" && natCount > 0) extraKeys.push(`nat-${natIdxFor(idx)}`);
                  }
                }
                conns.push({ from: "vpc", to: s.key, keys: ["all", s.key, s.rtbKey, ...extraKeys] });
                conns.push({
                  from: s.key,
                  to: s.rtbKey,
                  keys: ["all", s.key, s.rtbKey, ...extraKeys],
                });
              }
              if (!isVpcOnly && publicCount > 0) {
                conns.push({
                  from: "rtb-public",
                  to: "igw",
                  keys: ["all", "rtb-public", "igw", ...allSubs.filter((s) => s.kind === "public").map((s) => s.key)],
                });
              }
              if (endpoints === "s3") {
                for (let i = 0; i < privateCount; i++) {
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: "vpce",
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, "vpce"],
                  });
                }
              }
              if (!isVpcOnly && nat === "zonal" && natCount > 0) {
                for (let i = 0; i < privateCount; i++) {
                  const natIdx = natIdxFor(i);
                  conns.push({
                    from: `rtb-private-${i}`,
                    to: `nat-${natIdx}`,
                    keys: ["all", `private-${i}`, `rtb-private-${i}`, `nat-${natIdx}`],
                  });
                }
              }
              return conns;
            })()}
            deps={[azLayouts.length, publicCount, privateCount, endpoints, isVpcOnly, autoGen, nat, natUpdated, natCount]}
          />
        </div>

        {!autoGen && (
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider">VPC Name</label>
              <input
                type="text"
                value={vpcCustomName}
                placeholder={`${baseName}-vpc`}
                onChange={(e) => setVpcCustomName(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-2 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Subnet Names</label>
              {azLayouts.flatMap(azBox => azBox.items).map((sub) => (
                <div key={sub.key} className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    {sub.key.startsWith("public") ? "Public" : "Private"} Subnet
                  </span>
                  <input
                    type="text"
                    value={subCustomNames[sub.key] || ""}
                    placeholder={sub.label}
                    onChange={(e) => setSubCustomNames(prev => ({ ...prev, [sub.key]: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Route Tables</label>
              {!isVpcOnly && publicCount > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">Public Route Table</span>
                  <input
                    type="text"
                    value={rtbCustomNames["public"] || ""}
                    placeholder="rtb-public"
                    onChange={(e) => setRtbCustomNames(prev => ({ ...prev, public: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              )}
              {!isVpcOnly && Array.from({ length: privateCount }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">{`Private RT ${i + 1}`}</span>
                  <input
                    type="text"
                    value={rtbCustomNames[`private-${i}`] || ""}
                    placeholder={`rtb-private-${i + 1}`}
                    onChange={(e) => setRtbCustomNames(prev => ({ ...prev, [`private-${i}`]: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-neutral-400 uppercase font-mono tracking-wider block">Connections</label>
              {!isVpcOnly && publicCount > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono block">Internet Gateway</span>
                  <input
                    type="text"
                    value={netCustomNames["igw"] || ""}
                    placeholder="igw-default"
                    onChange={(e) => setNetCustomNames(prev => ({ ...prev, igw: e.target.value }))}
                    className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                  />
                </div>
              )}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 font-mono block">S3 Gateway Endpoint</span>
                <input
                  type="text"
                  value={netCustomNames["vpce"] || ""}
                  placeholder="S3 Gateway Endpoint"
                  onChange={(e) => setNetCustomNames(prev => ({ ...prev, vpce: e.target.value }))}
                  className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded p-1.5 focus:outline-none focus:border-blue-500 text-neutral-900 dark:text-neutral-50"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
