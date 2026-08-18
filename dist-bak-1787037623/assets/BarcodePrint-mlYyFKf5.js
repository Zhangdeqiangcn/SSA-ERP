import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useMaterialStore } from "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { bY as Grid, bL as Stack, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bv as TextField, bl as Alert, bm as Button, a4 as QrCode2, bf as Print, aS as Paper, T as Typography, m as Box, n as Divider, aO as Chip, aM as IconButton, bg as Refresh, be as Delete } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
const CODE39 = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  "A": "wnnnnwnnw",
  "B": "nnwnnwnnw",
  "C": "wnwnnwnnn",
  "D": "nnnnwwnnw",
  "E": "wnnnwwnnn",
  "F": "nnwnwwnnn",
  "G": "nnnnwnwnw",
  "H": "wnnnwnwnn",
  "I": "nnwnwnwnn",
  "J": "nnnnwwnwnn",
  "K": "wnnnnnwnw",
  "L": "nnwnnnwnw",
  "M": "wnwnnnwnn",
  "N": "nnnnwnnww",
  "O": "wnnnwnnwn",
  "P": "nnwnwnnwn",
  "Q": "nnnnwnnwn",
  "R": "wnnnwnnwn",
  "S": "nnwnnwnwn",
  "T": "nnnnwwnwn",
  "U": "wwnnnnnwn",
  "V": "nwwnnnnwn",
  "W": "wwwnnnnnn",
  "X": "nwnnwnnwn",
  "Y": "wwnnwnnnn",
  "Z": "nwwnwnnnn",
  "-": "nnnwnwnwn",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "wnwnwnnnn",
  "+": "nwnwnnnwn",
  "%": "nwnnnwnwn",
  "*": "nwnnwnwnw"
};
const NARROW = 2;
const WIDE = 6;
const QUIET = 10;
const GAP = 2;
const BAR_HEIGHT = 80;
const STORAGE_KEY = "ssa-erp-barcodes";
const ALLOWED = /^[A-Z0-9\-.$/+% ]*$/;
function buildBarcode(content) {
  const data = content.toUpperCase();
  const chars = ["*", ...data.split(""), "*"];
  const rects = [];
  let x = QUIET;
  for (const ch of chars) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const isWide = pattern[i] === "w";
      const w = isWide ? WIDE : NARROW;
      if (i % 2 === 0) {
        rects.push({ x, w });
      }
      x += w;
    }
    x += GAP;
  }
  const width = x + QUIET;
  return { rects, width, display: data };
}
const BarcodePrint = () => {
  const materials = useMaterialStore((s) => s.materials);
  const [content, setContent] = reactExports.useState("");
  const [rendered, setRendered] = reactExports.useState(null);
  const [recent, setRecent] = reactExports.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const invalid = reactExports.useMemo(() => {
    const up = content.toUpperCase();
    return up.length > 0 && !ALLOWED.test(up);
  }, [content]);
  const handleGenerate = () => {
    if (!content.trim() || invalid) return;
    const result = buildBarcode(content);
    setRendered(result);
    const entry = { content: content.toUpperCase(), savedAt: (/* @__PURE__ */ new Date()).toISOString() };
    const next = [entry, ...recent.filter((r) => r.content !== entry.content)].slice(0, 30);
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const handleReprint = (c) => {
    setContent(c);
    setRendered(buildBarcode(c));
  };
  const handleDelete = (idx) => {
    const next = recent.filter((_, i) => i !== idx);
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const handleMaterial = (code) => {
    setContent(code);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "条码打印（Code 39）", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2.5, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "从物料选择（可选）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            value: "",
            label: "从物料选择（可选）",
            onChange: (e) => handleMaterial(e.target.value),
            children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.code, children: [
              m.code,
              " · ",
              m.name
            ] }, m.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          label: "条码内容",
          value: content,
          onChange: (e) => setContent(e.target.value),
          placeholder: "仅支持 A-Z 0-9 及 - . $ / + % 和空格",
          fullWidth: true,
          error: invalid,
          helperText: invalid ? "包含非法字符，请仅使用大写字母、数字及 - . $ / + % 与空格" : ""
        }
      ),
      invalid && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "条码内容包含不支持的字符，将不能生成。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode2, {}),
            disabled: !content.trim() || invalid,
            onClick: handleGenerate,
            sx: { bgcolor: "#3B82F6" },
            children: "生成条码"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Print, {}),
            disabled: !rendered,
            onClick: () => window.print(),
            children: "打印标签"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 3, borderRadius: 3, minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: !rendered ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "输入内容后点击“生成条码”预览标签。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { id: "barcode-label", sx: { width: "100%", overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        width: rendered.width,
        height: BAR_HEIGHT + 24,
        viewBox: `0 0 ${rendered.width} ${BAR_HEIGHT + 24}`,
        role: "img",
        "aria-label": `条形码 ${rendered.display}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 0, y: 0, width: rendered.width, height: BAR_HEIGHT + 24, fill: "#ffffff" }),
          rendered.rects.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: r.x, y: 0, width: r.w, height: BAR_HEIGHT, fill: "#000000" }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: rendered.width / 2,
              y: BAR_HEIGHT + 18,
              textAnchor: "middle",
              fontFamily: "monospace",
              fontSize: "16",
              fill: "#000000",
              children: rendered.display
            }
          )
        ]
      }
    ) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 1.5, fontWeight: 600 }, children: "最近标签" }),
      recent.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无生成的标签。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 1.5 }, children: recent.map((r, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 1.5, borderRadius: 2, minWidth: 200 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: r.content, size: "small", sx: { mb: 0.5, fontFamily: "monospace" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", display: "block", color: "text.secondary", children: new Date(r.savedAt).toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "primary", onClick: () => handleReprint(r.content), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, { fontSize: "small" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
        ] })
      ] }) }, idx)) })
    ] })
  ] }) });
};
export {
  BarcodePrint as default
};
