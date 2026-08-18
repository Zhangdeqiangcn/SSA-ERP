import { e as serialize, f as compile, h as middleware, R as RULESET, k as combine, K as KEYFRAMES, l as copy, n as replace, W as WEBKIT, D as DECLARATION, o as hash, q as charat, M as MS, t as strlen, u as indexof, v as MOZ, w as match, x as stringify, y as dealloc, z as alloc, B as next, C as token, E as from, F as peek, G as delimit, H as slice, I as position, J as rulesheet, _ as _extends, L as _objectWithoutPropertiesLoose, N as clsx, O as reactIsExports, P as interopRequireDefaultExports, Q as requireObjectWithoutPropertiesLoose, S as require_extends, T as TransitionGroup, U as createPopper, V as Transition } from "./vendor-C0Ken1ns.js";
import { r as reactExports, c as React$1, j as jsxRuntimeExports, d as getAugmentedNamespace, b as reactDomExports } from "./vendor-react-Cc0tBtdY.js";
import { d as dayjs, w as weekOfYear, c as customParseFormatPlugin, l as localizedFormatPlugin, i as isBetweenPlugin } from "./vendor-date-DpsB6iVy.js";
function formatMuiErrorMessage$1(code) {
  let url = "https://mui.com/production-error/?code=" + code;
  for (let i = 1; i < arguments.length; i += 1) {
    url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return "Minified MUI error #" + code + "; visit " + url + " for the full message.";
}
const formatMuiErrorMessage = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: formatMuiErrorMessage$1
}, Symbol.toStringTag, { value: "Module" }));
const THEME_ID = "$$material";
function sheetForTag(tag) {
  if (tag.sheet) {
    return tag.sheet;
  }
  for (var i = 0; i < document.styleSheets.length; i++) {
    if (document.styleSheets[i].ownerNode === tag) {
      return document.styleSheets[i];
    }
  }
  return void 0;
}
function createStyleElement(options) {
  var tag = document.createElement("style");
  tag.setAttribute("data-emotion", options.key);
  if (options.nonce !== void 0) {
    tag.setAttribute("nonce", options.nonce);
  }
  tag.appendChild(document.createTextNode(""));
  tag.setAttribute("data-s", "");
  return tag;
}
var StyleSheet = /* @__PURE__ */ function() {
  function StyleSheet2(options) {
    var _this = this;
    this._insertTag = function(tag) {
      var before;
      if (_this.tags.length === 0) {
        if (_this.insertionPoint) {
          before = _this.insertionPoint.nextSibling;
        } else if (_this.prepend) {
          before = _this.container.firstChild;
        } else {
          before = _this.before;
        }
      } else {
        before = _this.tags[_this.tags.length - 1].nextSibling;
      }
      _this.container.insertBefore(tag, before);
      _this.tags.push(tag);
    };
    this.isSpeedy = options.speedy === void 0 ? true : options.speedy;
    this.tags = [];
    this.ctr = 0;
    this.nonce = options.nonce;
    this.key = options.key;
    this.container = options.container;
    this.prepend = options.prepend;
    this.insertionPoint = options.insertionPoint;
    this.before = null;
  }
  var _proto = StyleSheet2.prototype;
  _proto.hydrate = function hydrate(nodes) {
    nodes.forEach(this._insertTag);
  };
  _proto.insert = function insert(rule) {
    if (this.ctr % (this.isSpeedy ? 65e3 : 1) === 0) {
      this._insertTag(createStyleElement(this));
    }
    var tag = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var sheet = sheetForTag(tag);
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch (e2) {
      }
    } else {
      tag.appendChild(document.createTextNode(rule));
    }
    this.ctr++;
  };
  _proto.flush = function flush() {
    this.tags.forEach(function(tag) {
      var _tag$parentNode;
      return (_tag$parentNode = tag.parentNode) == null ? void 0 : _tag$parentNode.removeChild(tag);
    });
    this.tags = [];
    this.ctr = 0;
  };
  return StyleSheet2;
}();
function memoize$1(fn) {
  var cache = /* @__PURE__ */ Object.create(null);
  return function(arg) {
    if (cache[arg] === void 0) cache[arg] = fn(arg);
    return cache[arg];
  };
}
var identifierWithPointTracking = function identifierWithPointTracking2(begin, points, index) {
  var previous = 0;
  var character = 0;
  while (true) {
    previous = character;
    character = peek();
    if (previous === 38 && character === 12) {
      points[index] = 1;
    }
    if (token(character)) {
      break;
    }
    next();
  }
  return slice(begin, position);
};
var toRules = function toRules2(parsed, points) {
  var index = -1;
  var character = 44;
  do {
    switch (token(character)) {
      case 0:
        if (character === 38 && peek() === 12) {
          points[index] = 1;
        }
        parsed[index] += identifierWithPointTracking(position - 1, points, index);
        break;
      case 2:
        parsed[index] += delimit(character);
        break;
      case 4:
        if (character === 44) {
          parsed[++index] = peek() === 58 ? "&\f" : "";
          points[index] = parsed[index].length;
          break;
        }
      default:
        parsed[index] += from(character);
    }
  } while (character = next());
  return parsed;
};
var getRules = function getRules2(value, points) {
  return dealloc(toRules(alloc(value), points));
};
var fixedElements = /* @__PURE__ */ new WeakMap();
var compat = function compat2(element) {
  if (element.type !== "rule" || !element.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  element.length < 1) {
    return;
  }
  var value = element.value;
  var parent = element.parent;
  var isImplicitRule = element.column === parent.column && element.line === parent.line;
  while (parent.type !== "rule") {
    parent = parent.parent;
    if (!parent) return;
  }
  if (element.props.length === 1 && value.charCodeAt(0) !== 58 && !fixedElements.get(parent)) {
    return;
  }
  if (isImplicitRule) {
    return;
  }
  fixedElements.set(element, true);
  var points = [];
  var rules = getRules(value, points);
  var parentRules = parent.props;
  for (var i = 0, k2 = 0; i < rules.length; i++) {
    for (var j = 0; j < parentRules.length; j++, k2++) {
      element.props[k2] = points[i] ? rules[i].replace(/&\f/g, parentRules[j]) : parentRules[j] + " " + rules[i];
    }
  }
};
var removeLabel = function removeLabel2(element) {
  if (element.type === "decl") {
    var value = element.value;
    if (
      // charcode for l
      value.charCodeAt(0) === 108 && // charcode for b
      value.charCodeAt(2) === 98
    ) {
      element["return"] = "";
      element.value = "";
    }
  }
};
function prefix(value, length) {
  switch (hash(value, length)) {
    case 5103:
      return WEBKIT + "print-" + value + value;
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return WEBKIT + value + value;
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return WEBKIT + value + MOZ + value + MS + value + value;
    case 6828:
    case 4268:
      return WEBKIT + value + MS + value + value;
    case 6165:
      return WEBKIT + value + MS + "flex-" + value + value;
    case 5187:
      return WEBKIT + value + replace(value, /(\w+).+(:[^]+)/, WEBKIT + "box-$1$2" + MS + "flex-$1$2") + value;
    case 5443:
      return WEBKIT + value + MS + "flex-item-" + replace(value, /flex-|-self/, "") + value;
    case 4675:
      return WEBKIT + value + MS + "flex-line-pack" + replace(value, /align-content|flex-|-self/, "") + value;
    case 5548:
      return WEBKIT + value + MS + replace(value, "shrink", "negative") + value;
    case 5292:
      return WEBKIT + value + MS + replace(value, "basis", "preferred-size") + value;
    case 6060:
      return WEBKIT + "box-" + replace(value, "-grow", "") + WEBKIT + value + MS + replace(value, "grow", "positive") + value;
    case 4554:
      return WEBKIT + replace(value, /([^-])(transform)/g, "$1" + WEBKIT + "$2") + value;
    case 6187:
      return replace(replace(replace(value, /(zoom-|grab)/, WEBKIT + "$1"), /(image-set)/, WEBKIT + "$1"), value, "") + value;
    case 5495:
    case 3959:
      return replace(value, /(image-set\([^]*)/, WEBKIT + "$1$`$1");
    case 4968:
      return replace(replace(value, /(.+:)(flex-)?(.*)/, WEBKIT + "box-pack:$3" + MS + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + WEBKIT + value + value;
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return replace(value, /(.+)-inline(.+)/, WEBKIT + "$1$2") + value;
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      if (strlen(value) - 1 - length > 6) switch (charat(value, length + 1)) {
        case 109:
          if (charat(value, length + 4) !== 45) break;
        case 102:
          return replace(value, /(.+:)(.+)-([^]+)/, "$1" + WEBKIT + "$2-$3$1" + MOZ + (charat(value, length + 3) == 108 ? "$3" : "$2-$3")) + value;
        case 115:
          return ~indexof(value, "stretch") ? prefix(replace(value, "stretch", "fill-available"), length) + value : value;
      }
      break;
    case 4949:
      if (charat(value, length + 1) !== 115) break;
    case 6444:
      switch (charat(value, strlen(value) - 3 - (~indexof(value, "!important") && 10))) {
        case 107:
          return replace(value, ":", ":" + WEBKIT) + value;
        case 101:
          return replace(value, /(.+:)([^;!]+)(;|!.+)?/, "$1" + WEBKIT + (charat(value, 14) === 45 ? "inline-" : "") + "box$3$1" + WEBKIT + "$2$3$1" + MS + "$2box$3") + value;
      }
      break;
    case 5936:
      switch (charat(value, length + 11)) {
        case 114:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "tb") + value;
        case 108:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "tb-rl") + value;
        case 45:
          return WEBKIT + value + MS + replace(value, /[svh]\w+-[tblr]{2}/, "lr") + value;
      }
      return WEBKIT + value + MS + value + value;
  }
  return value;
}
var prefixer = function prefixer2(element, index, children, callback) {
  if (element.length > -1) {
    if (!element["return"]) switch (element.type) {
      case DECLARATION:
        element["return"] = prefix(element.value, element.length);
        break;
      case KEYFRAMES:
        return serialize([copy(element, {
          value: replace(element.value, "@", "@" + WEBKIT)
        })], callback);
      case RULESET:
        if (element.length) return combine(element.props, function(value) {
          switch (match(value, /(::plac\w+|:read-\w+)/)) {
            case ":read-only":
            case ":read-write":
              return serialize([copy(element, {
                props: [replace(value, /:(read-\w+)/, ":" + MOZ + "$1")]
              })], callback);
            case "::placeholder":
              return serialize([copy(element, {
                props: [replace(value, /:(plac\w+)/, ":" + WEBKIT + "input-$1")]
              }), copy(element, {
                props: [replace(value, /:(plac\w+)/, ":" + MOZ + "$1")]
              }), copy(element, {
                props: [replace(value, /:(plac\w+)/, MS + "input-$1")]
              })], callback);
          }
          return "";
        });
    }
  }
};
var defaultStylisPlugins = [prefixer];
var createCache = function createCache2(options) {
  var key = options.key;
  if (key === "css") {
    var ssrStyles = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(ssrStyles, function(node) {
      var dataEmotionAttribute = node.getAttribute("data-emotion");
      if (dataEmotionAttribute.indexOf(" ") === -1) {
        return;
      }
      document.head.appendChild(node);
      node.setAttribute("data-s", "");
    });
  }
  var stylisPlugins = options.stylisPlugins || defaultStylisPlugins;
  var inserted = {};
  var container;
  var nodesToHydrate = [];
  {
    container = options.container || document.head;
    Array.prototype.forEach.call(
      // this means we will ignore elements which don't have a space in them which
      // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
      document.querySelectorAll('style[data-emotion^="' + key + ' "]'),
      function(node) {
        var attrib = node.getAttribute("data-emotion").split(" ");
        for (var i = 1; i < attrib.length; i++) {
          inserted[attrib[i]] = true;
        }
        nodesToHydrate.push(node);
      }
    );
  }
  var _insert;
  var omnipresentPlugins = [compat, removeLabel];
  {
    var currentSheet;
    var finalizingPlugins = [stringify, rulesheet(function(rule) {
      currentSheet.insert(rule);
    })];
    var serializer = middleware(omnipresentPlugins.concat(stylisPlugins, finalizingPlugins));
    var stylis = function stylis2(styles2) {
      return serialize(compile(styles2), serializer);
    };
    _insert = function insert(selector, serialized, sheet, shouldCache) {
      currentSheet = sheet;
      stylis(selector ? selector + "{" + serialized.styles + "}" : serialized.styles);
      if (shouldCache) {
        cache.inserted[serialized.name] = true;
      }
    };
  }
  var cache = {
    key,
    sheet: new StyleSheet({
      key,
      container,
      nonce: options.nonce,
      speedy: options.speedy,
      prepend: options.prepend,
      insertionPoint: options.insertionPoint
    }),
    nonce: options.nonce,
    inserted,
    registered: {},
    insert: _insert
  };
  cache.sheet.hydrate(nodesToHydrate);
  return cache;
};
var isBrowser = true;
function getRegisteredStyles(registered, registeredStyles, classNames) {
  var rawClassName = "";
  classNames.split(" ").forEach(function(className) {
    if (registered[className] !== void 0) {
      registeredStyles.push(registered[className] + ";");
    } else if (className) {
      rawClassName += className + " ";
    }
  });
  return rawClassName;
}
var registerStyles = function registerStyles2(cache, serialized, isStringTag2) {
  var className = cache.key + "-" + serialized.name;
  if (
    // we only need to add the styles to the registered cache if the
    // class name could be used further down
    // the tree but if it's a string tag, we know it won't
    // so we don't have to add it to registered cache.
    // this improves memory usage since we can avoid storing the whole style string
    (isStringTag2 === false || // we need to always store it if we're in compat mode and
    // in node since emotion-server relies on whether a style is in
    // the registered cache to know whether a style is global or not
    // also, note that this check will be dead code eliminated in the browser
    isBrowser === false) && cache.registered[className] === void 0
  ) {
    cache.registered[className] = serialized.styles;
  }
};
var insertStyles = function insertStyles2(cache, serialized, isStringTag2) {
  registerStyles(cache, serialized, isStringTag2);
  var className = cache.key + "-" + serialized.name;
  if (cache.inserted[serialized.name] === void 0) {
    var current = serialized;
    do {
      cache.insert(serialized === current ? "." + className : "", current, cache.sheet, true);
      current = current.next;
    } while (current !== void 0);
  }
};
function murmur2(str) {
  var h2 = 0;
  var k2, i = 0, len = str.length;
  for (; len >= 4; ++i, len -= 4) {
    k2 = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
    k2 = /* Math.imul(k, m): */
    (k2 & 65535) * 1540483477 + ((k2 >>> 16) * 59797 << 16);
    k2 ^= /* k >>> r: */
    k2 >>> 24;
    h2 = /* Math.imul(k, m): */
    (k2 & 65535) * 1540483477 + ((k2 >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  }
  switch (len) {
    case 3:
      h2 ^= (str.charCodeAt(i + 2) & 255) << 16;
    case 2:
      h2 ^= (str.charCodeAt(i + 1) & 255) << 8;
    case 1:
      h2 ^= str.charCodeAt(i) & 255;
      h2 = /* Math.imul(h, m): */
      (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  }
  h2 ^= h2 >>> 13;
  h2 = /* Math.imul(h, m): */
  (h2 & 65535) * 1540483477 + ((h2 >>> 16) * 59797 << 16);
  return ((h2 ^ h2 >>> 15) >>> 0).toString(36);
}
var unitlessKeys = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
};
var hyphenateRegex = /[A-Z]|^ms/g;
var animationRegex = /_EMO_([^_]+?)_([^]*?)_EMO_/g;
var isCustomProperty = function isCustomProperty2(property) {
  return property.charCodeAt(1) === 45;
};
var isProcessableValue = function isProcessableValue2(value) {
  return value != null && typeof value !== "boolean";
};
var processStyleName = /* @__PURE__ */ memoize$1(function(styleName) {
  return isCustomProperty(styleName) ? styleName : styleName.replace(hyphenateRegex, "-$&").toLowerCase();
});
var processStyleValue = function processStyleValue2(key, value) {
  switch (key) {
    case "animation":
    case "animationName": {
      if (typeof value === "string") {
        return value.replace(animationRegex, function(match2, p1, p2) {
          cursor = {
            name: p1,
            styles: p2,
            next: cursor
          };
          return p1;
        });
      }
    }
  }
  if (unitlessKeys[key] !== 1 && !isCustomProperty(key) && typeof value === "number" && value !== 0) {
    return value + "px";
  }
  return value;
};
function handleInterpolation(mergedProps, registered, interpolation) {
  if (interpolation == null) {
    return "";
  }
  var componentSelector = interpolation;
  if (componentSelector.__emotion_styles !== void 0) {
    return componentSelector;
  }
  switch (typeof interpolation) {
    case "boolean": {
      return "";
    }
    case "object": {
      var keyframes2 = interpolation;
      if (keyframes2.anim === 1) {
        cursor = {
          name: keyframes2.name,
          styles: keyframes2.styles,
          next: cursor
        };
        return keyframes2.name;
      }
      var serializedStyles = interpolation;
      if (serializedStyles.styles !== void 0) {
        var next2 = serializedStyles.next;
        if (next2 !== void 0) {
          while (next2 !== void 0) {
            cursor = {
              name: next2.name,
              styles: next2.styles,
              next: cursor
            };
            next2 = next2.next;
          }
        }
        var styles2 = serializedStyles.styles + ";";
        return styles2;
      }
      return createStringFromObject(mergedProps, registered, interpolation);
    }
    case "function": {
      if (mergedProps !== void 0) {
        var previousCursor = cursor;
        var result = interpolation(mergedProps);
        cursor = previousCursor;
        return handleInterpolation(mergedProps, registered, result);
      }
      break;
    }
  }
  var asString = interpolation;
  if (registered == null) {
    return asString;
  }
  var cached = registered[asString];
  return cached !== void 0 ? cached : asString;
}
function createStringFromObject(mergedProps, registered, obj) {
  var string = "";
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      string += handleInterpolation(mergedProps, registered, obj[i]) + ";";
    }
  } else {
    for (var key in obj) {
      var value = obj[key];
      if (typeof value !== "object") {
        var asString = value;
        if (registered != null && registered[asString] !== void 0) {
          string += key + "{" + registered[asString] + "}";
        } else if (isProcessableValue(asString)) {
          string += processStyleName(key) + ":" + processStyleValue(key, asString) + ";";
        }
      } else {
        if (Array.isArray(value) && typeof value[0] === "string" && (registered == null || registered[value[0]] === void 0)) {
          for (var _i = 0; _i < value.length; _i++) {
            if (isProcessableValue(value[_i])) {
              string += processStyleName(key) + ":" + processStyleValue(key, value[_i]) + ";";
            }
          }
        } else {
          var interpolated = handleInterpolation(mergedProps, registered, value);
          switch (key) {
            case "animation":
            case "animationName": {
              string += processStyleName(key) + ":" + interpolated + ";";
              break;
            }
            default: {
              string += key + "{" + interpolated + "}";
            }
          }
        }
      }
    }
  }
  return string;
}
var labelPattern = /label:\s*([^\s;{]+)\s*(;|$)/g;
var cursor;
function serializeStyles(args, registered, mergedProps) {
  if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && args[0].styles !== void 0) {
    return args[0];
  }
  var stringMode = true;
  var styles2 = "";
  cursor = void 0;
  var strings = args[0];
  if (strings == null || strings.raw === void 0) {
    stringMode = false;
    styles2 += handleInterpolation(mergedProps, registered, strings);
  } else {
    var asTemplateStringsArr = strings;
    styles2 += asTemplateStringsArr[0];
  }
  for (var i = 1; i < args.length; i++) {
    styles2 += handleInterpolation(mergedProps, registered, args[i]);
    if (stringMode) {
      var templateStringsArr = strings;
      styles2 += templateStringsArr[i];
    }
  }
  labelPattern.lastIndex = 0;
  var identifierName = "";
  var match2;
  while ((match2 = labelPattern.exec(styles2)) !== null) {
    identifierName += "-" + match2[1];
  }
  var name = murmur2(styles2) + identifierName;
  return {
    name,
    styles: styles2,
    next: cursor
  };
}
var syncFallback = function syncFallback2(create) {
  return create();
};
var useInsertionEffect = React$1["useInsertionEffect"] ? React$1["useInsertionEffect"] : false;
var useInsertionEffectAlwaysWithSyncFallback = useInsertionEffect || syncFallback;
var useInsertionEffectWithLayoutFallback = useInsertionEffect || reactExports.useLayoutEffect;
var EmotionCacheContext = /* @__PURE__ */ reactExports.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement !== "undefined" ? /* @__PURE__ */ createCache({
    key: "css"
  }) : null
);
var CacheProvider = EmotionCacheContext.Provider;
var withEmotionCache = function withEmotionCache2(func) {
  return /* @__PURE__ */ reactExports.forwardRef(function(props, ref) {
    var cache = reactExports.useContext(EmotionCacheContext);
    return func(props, cache, ref);
  });
};
var ThemeContext$1 = /* @__PURE__ */ reactExports.createContext({});
var hasOwn = {}.hasOwnProperty;
var typePropName = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__";
var createEmotionProps = function createEmotionProps2(type, props) {
  var newProps = {};
  for (var _key in props) {
    if (hasOwn.call(props, _key)) {
      newProps[_key] = props[_key];
    }
  }
  newProps[typePropName] = type;
  return newProps;
};
var Insertion$1 = function Insertion(_ref) {
  var cache = _ref.cache, serialized = _ref.serialized, isStringTag2 = _ref.isStringTag;
  registerStyles(cache, serialized, isStringTag2);
  useInsertionEffectAlwaysWithSyncFallback(function() {
    return insertStyles(cache, serialized, isStringTag2);
  });
  return null;
};
var Emotion = /* @__PURE__ */ withEmotionCache(function(props, cache, ref) {
  var cssProp = props.css;
  if (typeof cssProp === "string" && cache.registered[cssProp] !== void 0) {
    cssProp = cache.registered[cssProp];
  }
  var WrappedComponent = props[typePropName];
  var registeredStyles = [cssProp];
  var className = "";
  if (typeof props.className === "string") {
    className = getRegisteredStyles(cache.registered, registeredStyles, props.className);
  } else if (props.className != null) {
    className = props.className + " ";
  }
  var serialized = serializeStyles(registeredStyles, void 0, reactExports.useContext(ThemeContext$1));
  className += cache.key + "-" + serialized.name;
  var newProps = {};
  for (var _key2 in props) {
    if (hasOwn.call(props, _key2) && _key2 !== "css" && _key2 !== typePropName && true) {
      newProps[_key2] = props[_key2];
    }
  }
  newProps.className = className;
  if (ref) {
    newProps.ref = ref;
  }
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(Insertion$1, {
    cache,
    serialized,
    isStringTag: typeof WrappedComponent === "string"
  }), /* @__PURE__ */ reactExports.createElement(WrappedComponent, newProps));
});
var Emotion$1 = Emotion;
var jsx = function jsx2(type, props) {
  var args = arguments;
  if (props == null || !hasOwn.call(props, "css")) {
    return reactExports.createElement.apply(void 0, args);
  }
  var argsLength = args.length;
  var createElementArgArray = new Array(argsLength);
  createElementArgArray[0] = Emotion$1;
  createElementArgArray[1] = createEmotionProps(type, props);
  for (var i = 2; i < argsLength; i++) {
    createElementArgArray[i] = args[i];
  }
  return reactExports.createElement.apply(null, createElementArgArray);
};
(function(_jsx) {
  var JSX;
  /* @__PURE__ */ (function(_JSX) {
  })(JSX || (JSX = _jsx.JSX || (_jsx.JSX = {})));
})(jsx || (jsx = {}));
var Global = /* @__PURE__ */ withEmotionCache(function(props, cache) {
  var styles2 = props.styles;
  var serialized = serializeStyles([styles2], void 0, reactExports.useContext(ThemeContext$1));
  var sheetRef = reactExports.useRef();
  useInsertionEffectWithLayoutFallback(function() {
    var key = cache.key + "-global";
    var sheet = new cache.sheet.constructor({
      key,
      nonce: cache.sheet.nonce,
      container: cache.sheet.container,
      speedy: cache.sheet.isSpeedy
    });
    var rehydrating = false;
    var node = document.querySelector('style[data-emotion="' + key + " " + serialized.name + '"]');
    if (cache.sheet.tags.length) {
      sheet.before = cache.sheet.tags[0];
    }
    if (node !== null) {
      rehydrating = true;
      node.setAttribute("data-emotion", key);
      sheet.hydrate([node]);
    }
    sheetRef.current = [sheet, rehydrating];
    return function() {
      sheet.flush();
    };
  }, [cache]);
  useInsertionEffectWithLayoutFallback(function() {
    var sheetRefCurrent = sheetRef.current;
    var sheet = sheetRefCurrent[0], rehydrating = sheetRefCurrent[1];
    if (rehydrating) {
      sheetRefCurrent[1] = false;
      return;
    }
    if (serialized.next !== void 0) {
      insertStyles(cache, serialized.next, true);
    }
    if (sheet.tags.length) {
      var element = sheet.tags[sheet.tags.length - 1].nextElementSibling;
      sheet.before = element;
      sheet.flush();
    }
    cache.insert("", serialized, sheet, false);
  }, [cache, serialized.name]);
  return null;
});
function css() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return serializeStyles(args);
}
function keyframes() {
  var insertable = css.apply(void 0, arguments);
  var name = "animation-" + insertable.name;
  return {
    name,
    styles: "@keyframes " + name + "{" + insertable.styles + "}",
    anim: 1,
    toString: function toString() {
      return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
    }
  };
}
var reactPropsRegex = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|popover|popoverTarget|popoverTargetAction|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/;
var isPropValid = /* @__PURE__ */ memoize$1(
  function(prop) {
    return reactPropsRegex.test(prop) || prop.charCodeAt(0) === 111 && prop.charCodeAt(1) === 110 && prop.charCodeAt(2) < 91;
  }
  /* Z+1 */
);
var testOmitPropsOnStringTag = isPropValid;
var testOmitPropsOnComponent = function testOmitPropsOnComponent2(key) {
  return key !== "theme";
};
var getDefaultShouldForwardProp = function getDefaultShouldForwardProp2(tag) {
  return typeof tag === "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  tag.charCodeAt(0) > 96 ? testOmitPropsOnStringTag : testOmitPropsOnComponent;
};
var composeShouldForwardProps = function composeShouldForwardProps2(tag, options, isReal) {
  var shouldForwardProp2;
  if (options) {
    var optionsShouldForwardProp = options.shouldForwardProp;
    shouldForwardProp2 = tag.__emotion_forwardProp && optionsShouldForwardProp ? function(propName) {
      return tag.__emotion_forwardProp(propName) && optionsShouldForwardProp(propName);
    } : optionsShouldForwardProp;
  }
  if (typeof shouldForwardProp2 !== "function" && isReal) {
    shouldForwardProp2 = tag.__emotion_forwardProp;
  }
  return shouldForwardProp2;
};
var Insertion2 = function Insertion3(_ref) {
  var cache = _ref.cache, serialized = _ref.serialized, isStringTag2 = _ref.isStringTag;
  registerStyles(cache, serialized, isStringTag2);
  useInsertionEffectAlwaysWithSyncFallback(function() {
    return insertStyles(cache, serialized, isStringTag2);
  });
  return null;
};
var createStyled$3 = function createStyled(tag, options) {
  var isReal = tag.__emotion_real === tag;
  var baseTag = isReal && tag.__emotion_base || tag;
  var identifierName;
  var targetClassName;
  if (options !== void 0) {
    identifierName = options.label;
    targetClassName = options.target;
  }
  var shouldForwardProp2 = composeShouldForwardProps(tag, options, isReal);
  var defaultShouldForwardProp = shouldForwardProp2 || getDefaultShouldForwardProp(baseTag);
  var shouldUseAs = !defaultShouldForwardProp("as");
  return function() {
    var args = arguments;
    var styles2 = isReal && tag.__emotion_styles !== void 0 ? tag.__emotion_styles.slice(0) : [];
    if (identifierName !== void 0) {
      styles2.push("label:" + identifierName + ";");
    }
    if (args[0] == null || args[0].raw === void 0) {
      styles2.push.apply(styles2, args);
    } else {
      var templateStringsArr = args[0];
      styles2.push(templateStringsArr[0]);
      var len = args.length;
      var i = 1;
      for (; i < len; i++) {
        styles2.push(args[i], templateStringsArr[i]);
      }
    }
    var Styled = withEmotionCache(function(props, cache, ref) {
      var FinalTag = shouldUseAs && props.as || baseTag;
      var className = "";
      var classInterpolations = [];
      var mergedProps = props;
      if (props.theme == null) {
        mergedProps = {};
        for (var key in props) {
          mergedProps[key] = props[key];
        }
        mergedProps.theme = reactExports.useContext(ThemeContext$1);
      }
      if (typeof props.className === "string") {
        className = getRegisteredStyles(cache.registered, classInterpolations, props.className);
      } else if (props.className != null) {
        className = props.className + " ";
      }
      var serialized = serializeStyles(styles2.concat(classInterpolations), cache.registered, mergedProps);
      className += cache.key + "-" + serialized.name;
      if (targetClassName !== void 0) {
        className += " " + targetClassName;
      }
      var finalShouldForwardProp = shouldUseAs && shouldForwardProp2 === void 0 ? getDefaultShouldForwardProp(FinalTag) : defaultShouldForwardProp;
      var newProps = {};
      for (var _key in props) {
        if (shouldUseAs && _key === "as") continue;
        if (finalShouldForwardProp(_key)) {
          newProps[_key] = props[_key];
        }
      }
      newProps.className = className;
      if (ref) {
        newProps.ref = ref;
      }
      return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(Insertion2, {
        cache,
        serialized,
        isStringTag: typeof FinalTag === "string"
      }), /* @__PURE__ */ reactExports.createElement(FinalTag, newProps));
    });
    Styled.displayName = identifierName !== void 0 ? identifierName : "Styled(" + (typeof baseTag === "string" ? baseTag : baseTag.displayName || baseTag.name || "Component") + ")";
    Styled.defaultProps = tag.defaultProps;
    Styled.__emotion_real = Styled;
    Styled.__emotion_base = baseTag;
    Styled.__emotion_styles = styles2;
    Styled.__emotion_forwardProp = shouldForwardProp2;
    Object.defineProperty(Styled, "toString", {
      value: function value() {
        return "." + targetClassName;
      }
    });
    Styled.withComponent = function(nextTag, nextOptions) {
      var newStyled = createStyled(nextTag, _extends({}, options, nextOptions, {
        shouldForwardProp: composeShouldForwardProps(Styled, nextOptions, true)
      }));
      return newStyled.apply(void 0, styles2);
    };
    return Styled;
  };
};
var tags = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "text",
  "tspan"
];
var styled$3 = createStyled$3.bind(null);
tags.forEach(function(tagName) {
  styled$3[tagName] = styled$3(tagName);
});
function getCache(injectFirst, enableCssLayer) {
  const emotionCache = createCache({
    key: "css",
    prepend: injectFirst
  });
  if (enableCssLayer) {
    const prevInsert = emotionCache.insert;
    emotionCache.insert = (...args) => {
      if (!args[1].styles.match(/^@layer\s+[^{]*$/)) {
        args[1].styles = `@layer mui {${args[1].styles}}`;
      }
      return prevInsert(...args);
    };
  }
  return emotionCache;
}
const cacheMap = /* @__PURE__ */ new Map();
function StyledEngineProvider(props) {
  const {
    injectFirst,
    enableCssLayer,
    children
  } = props;
  const cache = reactExports.useMemo(() => {
    const cacheKey = `${injectFirst}-${enableCssLayer}`;
    if (typeof document === "object" && cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey);
    }
    const fresh = getCache(injectFirst, enableCssLayer);
    cacheMap.set(cacheKey, fresh);
    return fresh;
  }, [injectFirst, enableCssLayer]);
  if (injectFirst || enableCssLayer) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CacheProvider, {
      value: cache,
      children
    });
  }
  return children;
}
function isEmpty$4(obj) {
  return obj === void 0 || obj === null || Object.keys(obj).length === 0;
}
function GlobalStyles$2(props) {
  const {
    styles: styles2,
    defaultTheme: defaultTheme2 = {}
  } = props;
  const globalStyles = typeof styles2 === "function" ? (themeInput) => styles2(isEmpty$4(themeInput) ? defaultTheme2 : themeInput) : styles2;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Global, {
    styles: globalStyles
  });
}
function styled$2(tag, options) {
  const stylesFactory = styled$3(tag, options);
  return stylesFactory;
}
const internal_processStyles = (tag, processor) => {
  if (Array.isArray(tag.__emotion_styles)) {
    tag.__emotion_styles = processor(tag.__emotion_styles);
  }
};
const wrapper = [];
function internal_serializeStyles(styles2) {
  wrapper[0] = styles2;
  return serializeStyles(wrapper);
}
const styledEngine = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GlobalStyles: GlobalStyles$2,
  StyledEngineProvider,
  ThemeContext: ThemeContext$1,
  css,
  default: styled$2,
  internal_processStyles,
  internal_serializeStyles,
  keyframes
}, Symbol.toStringTag, { value: "Module" }));
function isPlainObject(item) {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(item);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in item) && !(Symbol.iterator in item);
}
function deepClone(source) {
  if (/* @__PURE__ */ reactExports.isValidElement(source) || !isPlainObject(source)) {
    return source;
  }
  const output = {};
  Object.keys(source).forEach((key) => {
    output[key] = deepClone(source[key]);
  });
  return output;
}
function deepmerge$1(target, source, options = {
  clone: true
}) {
  const output = options.clone ? _extends({}, target) : target;
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach((key) => {
      if (/* @__PURE__ */ reactExports.isValidElement(source[key])) {
        output[key] = source[key];
      } else if (isPlainObject(source[key]) && // Avoid prototype pollution
      Object.prototype.hasOwnProperty.call(target, key) && isPlainObject(target[key])) {
        output[key] = deepmerge$1(target[key], source[key], options);
      } else if (options.clone) {
        output[key] = isPlainObject(source[key]) ? deepClone(source[key]) : source[key];
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}
const deepmerge = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: deepmerge$1,
  isPlainObject
}, Symbol.toStringTag, { value: "Module" }));
const _excluded$23 = ["values", "unit", "step"];
const sortBreakpointsValues = (values2) => {
  const breakpointsAsArray = Object.keys(values2).map((key) => ({
    key,
    val: values2[key]
  })) || [];
  breakpointsAsArray.sort((breakpoint1, breakpoint2) => breakpoint1.val - breakpoint2.val);
  return breakpointsAsArray.reduce((acc, obj) => {
    return _extends({}, acc, {
      [obj.key]: obj.val
    });
  }, {});
};
function createBreakpoints(breakpoints) {
  const {
    // The breakpoint **start** at this value.
    // For instance with the first breakpoint xs: [xs, sm).
    values: values2 = {
      xs: 0,
      // phone
      sm: 600,
      // tablet
      md: 900,
      // small laptop
      lg: 1200,
      // desktop
      xl: 1536
      // large screen
    },
    unit = "px",
    step = 5
  } = breakpoints, other = _objectWithoutPropertiesLoose(breakpoints, _excluded$23);
  const sortedValues = sortBreakpointsValues(values2);
  const keys = Object.keys(sortedValues);
  function up(key) {
    const value = typeof values2[key] === "number" ? values2[key] : key;
    return `@media (min-width:${value}${unit})`;
  }
  function down(key) {
    const value = typeof values2[key] === "number" ? values2[key] : key;
    return `@media (max-width:${value - step / 100}${unit})`;
  }
  function between(start, end) {
    const endIndex = keys.indexOf(end);
    return `@media (min-width:${typeof values2[start] === "number" ? values2[start] : start}${unit}) and (max-width:${(endIndex !== -1 && typeof values2[keys[endIndex]] === "number" ? values2[keys[endIndex]] : end) - step / 100}${unit})`;
  }
  function only(key) {
    if (keys.indexOf(key) + 1 < keys.length) {
      return between(key, keys[keys.indexOf(key) + 1]);
    }
    return up(key);
  }
  function not(key) {
    const keyIndex = keys.indexOf(key);
    if (keyIndex === 0) {
      return up(keys[1]);
    }
    if (keyIndex === keys.length - 1) {
      return down(keys[keyIndex]);
    }
    return between(key, keys[keys.indexOf(key) + 1]).replace("@media", "@media not all and");
  }
  return _extends({
    keys,
    values: sortedValues,
    up,
    down,
    between,
    only,
    not,
    unit
  }, other);
}
const shape = {
  borderRadius: 4
};
function merge(acc, item) {
  if (!item) {
    return acc;
  }
  return deepmerge$1(acc, item, {
    clone: false
    // No need to clone deep, it's way faster.
  });
}
const values = {
  xs: 0,
  // phone
  sm: 600,
  // tablet
  md: 900,
  // small laptop
  lg: 1200,
  // desktop
  xl: 1536
  // large screen
};
const defaultBreakpoints = {
  // Sorted ASC by size. That's important.
  // It can't be configured as it's used statically for propTypes.
  keys: ["xs", "sm", "md", "lg", "xl"],
  up: (key) => `@media (min-width:${values[key]}px)`
};
function handleBreakpoints(props, propValue, styleFromPropValue) {
  const theme = props.theme || {};
  if (Array.isArray(propValue)) {
    const themeBreakpoints = theme.breakpoints || defaultBreakpoints;
    return propValue.reduce((acc, item, index) => {
      acc[themeBreakpoints.up(themeBreakpoints.keys[index])] = styleFromPropValue(propValue[index]);
      return acc;
    }, {});
  }
  if (typeof propValue === "object") {
    const themeBreakpoints = theme.breakpoints || defaultBreakpoints;
    return Object.keys(propValue).reduce((acc, breakpoint) => {
      if (Object.keys(themeBreakpoints.values || values).indexOf(breakpoint) !== -1) {
        const mediaKey = themeBreakpoints.up(breakpoint);
        acc[mediaKey] = styleFromPropValue(propValue[breakpoint], breakpoint);
      } else {
        const cssKey = breakpoint;
        acc[cssKey] = propValue[cssKey];
      }
      return acc;
    }, {});
  }
  const output = styleFromPropValue(propValue);
  return output;
}
function createEmptyBreakpointObject(breakpointsInput = {}) {
  var _breakpointsInput$key;
  const breakpointsInOrder = (_breakpointsInput$key = breakpointsInput.keys) == null ? void 0 : _breakpointsInput$key.reduce((acc, key) => {
    const breakpointStyleKey = breakpointsInput.up(key);
    acc[breakpointStyleKey] = {};
    return acc;
  }, {});
  return breakpointsInOrder || {};
}
function removeUnusedBreakpoints(breakpointKeys, style2) {
  return breakpointKeys.reduce((acc, key) => {
    const breakpointOutput = acc[key];
    const isBreakpointUnused = !breakpointOutput || Object.keys(breakpointOutput).length === 0;
    if (isBreakpointUnused) {
      delete acc[key];
    }
    return acc;
  }, style2);
}
function mergeBreakpointsInOrder(breakpointsInput, ...styles2) {
  const emptyBreakpoints = createEmptyBreakpointObject(breakpointsInput);
  const mergedOutput = [emptyBreakpoints, ...styles2].reduce((prev, next2) => deepmerge$1(prev, next2), {});
  return removeUnusedBreakpoints(Object.keys(emptyBreakpoints), mergedOutput);
}
function computeBreakpointsBase(breakpointValues, themeBreakpoints) {
  if (typeof breakpointValues !== "object") {
    return {};
  }
  const base = {};
  const breakpointsKeys = Object.keys(themeBreakpoints);
  if (Array.isArray(breakpointValues)) {
    breakpointsKeys.forEach((breakpoint, i) => {
      if (i < breakpointValues.length) {
        base[breakpoint] = true;
      }
    });
  } else {
    breakpointsKeys.forEach((breakpoint) => {
      if (breakpointValues[breakpoint] != null) {
        base[breakpoint] = true;
      }
    });
  }
  return base;
}
function resolveBreakpointValues({
  values: breakpointValues,
  breakpoints: themeBreakpoints,
  base: customBase
}) {
  const base = customBase || computeBreakpointsBase(breakpointValues, themeBreakpoints);
  const keys = Object.keys(base);
  if (keys.length === 0) {
    return breakpointValues;
  }
  let previous;
  return keys.reduce((acc, breakpoint, i) => {
    if (Array.isArray(breakpointValues)) {
      acc[breakpoint] = breakpointValues[i] != null ? breakpointValues[i] : breakpointValues[previous];
      previous = i;
    } else if (typeof breakpointValues === "object") {
      acc[breakpoint] = breakpointValues[breakpoint] != null ? breakpointValues[breakpoint] : breakpointValues[previous];
      previous = breakpoint;
    } else {
      acc[breakpoint] = breakpointValues;
    }
    return acc;
  }, {});
}
function capitalize$1(string) {
  if (typeof string !== "string") {
    throw new Error(formatMuiErrorMessage$1(7));
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}
const capitalize = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: capitalize$1
}, Symbol.toStringTag, { value: "Module" }));
function getPath(obj, path, checkVars = true) {
  if (!path || typeof path !== "string") {
    return null;
  }
  if (obj && obj.vars && checkVars) {
    const val = `vars.${path}`.split(".").reduce((acc, item) => acc && acc[item] ? acc[item] : null, obj);
    if (val != null) {
      return val;
    }
  }
  return path.split(".").reduce((acc, item) => {
    if (acc && acc[item] != null) {
      return acc[item];
    }
    return null;
  }, obj);
}
function getStyleValue$1(themeMapping, transform, propValueFinal, userValue = propValueFinal) {
  let value;
  if (typeof themeMapping === "function") {
    value = themeMapping(propValueFinal);
  } else if (Array.isArray(themeMapping)) {
    value = themeMapping[propValueFinal] || userValue;
  } else {
    value = getPath(themeMapping, propValueFinal) || userValue;
  }
  if (transform) {
    value = transform(value, userValue, themeMapping);
  }
  return value;
}
function style$2(options) {
  const {
    prop,
    cssProperty = options.prop,
    themeKey,
    transform
  } = options;
  const fn = (props) => {
    if (props[prop] == null) {
      return null;
    }
    const propValue = props[prop];
    const theme = props.theme;
    const themeMapping = getPath(theme, themeKey) || {};
    const styleFromPropValue = (propValueFinal) => {
      let value = getStyleValue$1(themeMapping, transform, propValueFinal);
      if (propValueFinal === value && typeof propValueFinal === "string") {
        value = getStyleValue$1(themeMapping, transform, `${prop}${propValueFinal === "default" ? "" : capitalize$1(propValueFinal)}`, propValueFinal);
      }
      if (cssProperty === false) {
        return value;
      }
      return {
        [cssProperty]: value
      };
    };
    return handleBreakpoints(props, propValue, styleFromPropValue);
  };
  fn.propTypes = {};
  fn.filterProps = [prop];
  return fn;
}
function memoize(fn) {
  const cache = {};
  return (arg) => {
    if (cache[arg] === void 0) {
      cache[arg] = fn(arg);
    }
    return cache[arg];
  };
}
const properties = {
  m: "margin",
  p: "padding"
};
const directions = {
  t: "Top",
  r: "Right",
  b: "Bottom",
  l: "Left",
  x: ["Left", "Right"],
  y: ["Top", "Bottom"]
};
const aliases = {
  marginX: "mx",
  marginY: "my",
  paddingX: "px",
  paddingY: "py"
};
const getCssProperties = memoize((prop) => {
  if (prop.length > 2) {
    if (aliases[prop]) {
      prop = aliases[prop];
    } else {
      return [prop];
    }
  }
  const [a, b2] = prop.split("");
  const property = properties[a];
  const direction = directions[b2] || "";
  return Array.isArray(direction) ? direction.map((dir) => property + dir) : [property + direction];
});
const marginKeys = ["m", "mt", "mr", "mb", "ml", "mx", "my", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginX", "marginY", "marginInline", "marginInlineStart", "marginInlineEnd", "marginBlock", "marginBlockStart", "marginBlockEnd"];
const paddingKeys = ["p", "pt", "pr", "pb", "pl", "px", "py", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "paddingX", "paddingY", "paddingInline", "paddingInlineStart", "paddingInlineEnd", "paddingBlock", "paddingBlockStart", "paddingBlockEnd"];
[...marginKeys, ...paddingKeys];
function createUnaryUnit(theme, themeKey, defaultValue, propName) {
  var _getPath;
  const themeSpacing = (_getPath = getPath(theme, themeKey, false)) != null ? _getPath : defaultValue;
  if (typeof themeSpacing === "number") {
    return (abs) => {
      if (typeof abs === "string") {
        return abs;
      }
      return themeSpacing * abs;
    };
  }
  if (Array.isArray(themeSpacing)) {
    return (abs) => {
      if (typeof abs === "string") {
        return abs;
      }
      return themeSpacing[abs];
    };
  }
  if (typeof themeSpacing === "function") {
    return themeSpacing;
  }
  return () => void 0;
}
function createUnarySpacing(theme) {
  return createUnaryUnit(theme, "spacing", 8);
}
function getValue(transformer, propValue) {
  if (typeof propValue === "string" || propValue == null) {
    return propValue;
  }
  const abs = Math.abs(propValue);
  const transformed = transformer(abs);
  if (propValue >= 0) {
    return transformed;
  }
  if (typeof transformed === "number") {
    return -transformed;
  }
  return `-${transformed}`;
}
function getStyleFromPropValue(cssProperties, transformer) {
  return (propValue) => cssProperties.reduce((acc, cssProperty) => {
    acc[cssProperty] = getValue(transformer, propValue);
    return acc;
  }, {});
}
function resolveCssProperty(props, keys, prop, transformer) {
  if (keys.indexOf(prop) === -1) {
    return null;
  }
  const cssProperties = getCssProperties(prop);
  const styleFromPropValue = getStyleFromPropValue(cssProperties, transformer);
  const propValue = props[prop];
  return handleBreakpoints(props, propValue, styleFromPropValue);
}
function style$1(props, keys) {
  const transformer = createUnarySpacing(props.theme);
  return Object.keys(props).map((prop) => resolveCssProperty(props, keys, prop, transformer)).reduce(merge, {});
}
function margin(props) {
  return style$1(props, marginKeys);
}
margin.propTypes = {};
margin.filterProps = marginKeys;
function padding(props) {
  return style$1(props, paddingKeys);
}
padding.propTypes = {};
padding.filterProps = paddingKeys;
function createSpacing(spacingInput = 8) {
  if (spacingInput.mui) {
    return spacingInput;
  }
  const transform = createUnarySpacing({
    spacing: spacingInput
  });
  const spacing = (...argsInput) => {
    const args = argsInput.length === 0 ? [1] : argsInput;
    return args.map((argument) => {
      const output = transform(argument);
      return typeof output === "number" ? `${output}px` : output;
    }).join(" ");
  };
  spacing.mui = true;
  return spacing;
}
function compose(...styles2) {
  const handlers = styles2.reduce((acc, style2) => {
    style2.filterProps.forEach((prop) => {
      acc[prop] = style2;
    });
    return acc;
  }, {});
  const fn = (props) => {
    return Object.keys(props).reduce((acc, prop) => {
      if (handlers[prop]) {
        return merge(acc, handlers[prop](props));
      }
      return acc;
    }, {});
  };
  fn.propTypes = {};
  fn.filterProps = styles2.reduce((acc, style2) => acc.concat(style2.filterProps), []);
  return fn;
}
function borderTransform(value) {
  if (typeof value !== "number") {
    return value;
  }
  return `${value}px solid`;
}
function createBorderStyle(prop, transform) {
  return style$2({
    prop,
    themeKey: "borders",
    transform
  });
}
const border = createBorderStyle("border", borderTransform);
const borderTop = createBorderStyle("borderTop", borderTransform);
const borderRight = createBorderStyle("borderRight", borderTransform);
const borderBottom = createBorderStyle("borderBottom", borderTransform);
const borderLeft = createBorderStyle("borderLeft", borderTransform);
const borderColor = createBorderStyle("borderColor");
const borderTopColor = createBorderStyle("borderTopColor");
const borderRightColor = createBorderStyle("borderRightColor");
const borderBottomColor = createBorderStyle("borderBottomColor");
const borderLeftColor = createBorderStyle("borderLeftColor");
const outline = createBorderStyle("outline", borderTransform);
const outlineColor = createBorderStyle("outlineColor");
const borderRadius = (props) => {
  if (props.borderRadius !== void 0 && props.borderRadius !== null) {
    const transformer = createUnaryUnit(props.theme, "shape.borderRadius", 4);
    const styleFromPropValue = (propValue) => ({
      borderRadius: getValue(transformer, propValue)
    });
    return handleBreakpoints(props, props.borderRadius, styleFromPropValue);
  }
  return null;
};
borderRadius.propTypes = {};
borderRadius.filterProps = ["borderRadius"];
compose(border, borderTop, borderRight, borderBottom, borderLeft, borderColor, borderTopColor, borderRightColor, borderBottomColor, borderLeftColor, borderRadius, outline, outlineColor);
const gap = (props) => {
  if (props.gap !== void 0 && props.gap !== null) {
    const transformer = createUnaryUnit(props.theme, "spacing", 8);
    const styleFromPropValue = (propValue) => ({
      gap: getValue(transformer, propValue)
    });
    return handleBreakpoints(props, props.gap, styleFromPropValue);
  }
  return null;
};
gap.propTypes = {};
gap.filterProps = ["gap"];
const columnGap = (props) => {
  if (props.columnGap !== void 0 && props.columnGap !== null) {
    const transformer = createUnaryUnit(props.theme, "spacing", 8);
    const styleFromPropValue = (propValue) => ({
      columnGap: getValue(transformer, propValue)
    });
    return handleBreakpoints(props, props.columnGap, styleFromPropValue);
  }
  return null;
};
columnGap.propTypes = {};
columnGap.filterProps = ["columnGap"];
const rowGap = (props) => {
  if (props.rowGap !== void 0 && props.rowGap !== null) {
    const transformer = createUnaryUnit(props.theme, "spacing", 8);
    const styleFromPropValue = (propValue) => ({
      rowGap: getValue(transformer, propValue)
    });
    return handleBreakpoints(props, props.rowGap, styleFromPropValue);
  }
  return null;
};
rowGap.propTypes = {};
rowGap.filterProps = ["rowGap"];
const gridColumn = style$2({
  prop: "gridColumn"
});
const gridRow = style$2({
  prop: "gridRow"
});
const gridAutoFlow = style$2({
  prop: "gridAutoFlow"
});
const gridAutoColumns = style$2({
  prop: "gridAutoColumns"
});
const gridAutoRows = style$2({
  prop: "gridAutoRows"
});
const gridTemplateColumns = style$2({
  prop: "gridTemplateColumns"
});
const gridTemplateRows = style$2({
  prop: "gridTemplateRows"
});
const gridTemplateAreas = style$2({
  prop: "gridTemplateAreas"
});
const gridArea = style$2({
  prop: "gridArea"
});
compose(gap, columnGap, rowGap, gridColumn, gridRow, gridAutoFlow, gridAutoColumns, gridAutoRows, gridTemplateColumns, gridTemplateRows, gridTemplateAreas, gridArea);
function paletteTransform(value, userValue) {
  if (userValue === "grey") {
    return userValue;
  }
  return value;
}
const color = style$2({
  prop: "color",
  themeKey: "palette",
  transform: paletteTransform
});
const bgcolor = style$2({
  prop: "bgcolor",
  cssProperty: "backgroundColor",
  themeKey: "palette",
  transform: paletteTransform
});
const backgroundColor = style$2({
  prop: "backgroundColor",
  themeKey: "palette",
  transform: paletteTransform
});
compose(color, bgcolor, backgroundColor);
function sizingTransform(value) {
  return value <= 1 && value !== 0 ? `${value * 100}%` : value;
}
const width = style$2({
  prop: "width",
  transform: sizingTransform
});
const maxWidth = (props) => {
  if (props.maxWidth !== void 0 && props.maxWidth !== null) {
    const styleFromPropValue = (propValue) => {
      var _props$theme, _props$theme2;
      const breakpoint = ((_props$theme = props.theme) == null || (_props$theme = _props$theme.breakpoints) == null || (_props$theme = _props$theme.values) == null ? void 0 : _props$theme[propValue]) || values[propValue];
      if (!breakpoint) {
        return {
          maxWidth: sizingTransform(propValue)
        };
      }
      if (((_props$theme2 = props.theme) == null || (_props$theme2 = _props$theme2.breakpoints) == null ? void 0 : _props$theme2.unit) !== "px") {
        return {
          maxWidth: `${breakpoint}${props.theme.breakpoints.unit}`
        };
      }
      return {
        maxWidth: breakpoint
      };
    };
    return handleBreakpoints(props, props.maxWidth, styleFromPropValue);
  }
  return null;
};
maxWidth.filterProps = ["maxWidth"];
const minWidth = style$2({
  prop: "minWidth",
  transform: sizingTransform
});
const height = style$2({
  prop: "height",
  transform: sizingTransform
});
const maxHeight = style$2({
  prop: "maxHeight",
  transform: sizingTransform
});
const minHeight = style$2({
  prop: "minHeight",
  transform: sizingTransform
});
style$2({
  prop: "size",
  cssProperty: "width",
  transform: sizingTransform
});
style$2({
  prop: "size",
  cssProperty: "height",
  transform: sizingTransform
});
const boxSizing = style$2({
  prop: "boxSizing"
});
compose(width, maxWidth, minWidth, height, maxHeight, minHeight, boxSizing);
const defaultSxConfig = {
  // borders
  border: {
    themeKey: "borders",
    transform: borderTransform
  },
  borderTop: {
    themeKey: "borders",
    transform: borderTransform
  },
  borderRight: {
    themeKey: "borders",
    transform: borderTransform
  },
  borderBottom: {
    themeKey: "borders",
    transform: borderTransform
  },
  borderLeft: {
    themeKey: "borders",
    transform: borderTransform
  },
  borderColor: {
    themeKey: "palette"
  },
  borderTopColor: {
    themeKey: "palette"
  },
  borderRightColor: {
    themeKey: "palette"
  },
  borderBottomColor: {
    themeKey: "palette"
  },
  borderLeftColor: {
    themeKey: "palette"
  },
  outline: {
    themeKey: "borders",
    transform: borderTransform
  },
  outlineColor: {
    themeKey: "palette"
  },
  borderRadius: {
    themeKey: "shape.borderRadius",
    style: borderRadius
  },
  // palette
  color: {
    themeKey: "palette",
    transform: paletteTransform
  },
  bgcolor: {
    themeKey: "palette",
    cssProperty: "backgroundColor",
    transform: paletteTransform
  },
  backgroundColor: {
    themeKey: "palette",
    transform: paletteTransform
  },
  // spacing
  p: {
    style: padding
  },
  pt: {
    style: padding
  },
  pr: {
    style: padding
  },
  pb: {
    style: padding
  },
  pl: {
    style: padding
  },
  px: {
    style: padding
  },
  py: {
    style: padding
  },
  padding: {
    style: padding
  },
  paddingTop: {
    style: padding
  },
  paddingRight: {
    style: padding
  },
  paddingBottom: {
    style: padding
  },
  paddingLeft: {
    style: padding
  },
  paddingX: {
    style: padding
  },
  paddingY: {
    style: padding
  },
  paddingInline: {
    style: padding
  },
  paddingInlineStart: {
    style: padding
  },
  paddingInlineEnd: {
    style: padding
  },
  paddingBlock: {
    style: padding
  },
  paddingBlockStart: {
    style: padding
  },
  paddingBlockEnd: {
    style: padding
  },
  m: {
    style: margin
  },
  mt: {
    style: margin
  },
  mr: {
    style: margin
  },
  mb: {
    style: margin
  },
  ml: {
    style: margin
  },
  mx: {
    style: margin
  },
  my: {
    style: margin
  },
  margin: {
    style: margin
  },
  marginTop: {
    style: margin
  },
  marginRight: {
    style: margin
  },
  marginBottom: {
    style: margin
  },
  marginLeft: {
    style: margin
  },
  marginX: {
    style: margin
  },
  marginY: {
    style: margin
  },
  marginInline: {
    style: margin
  },
  marginInlineStart: {
    style: margin
  },
  marginInlineEnd: {
    style: margin
  },
  marginBlock: {
    style: margin
  },
  marginBlockStart: {
    style: margin
  },
  marginBlockEnd: {
    style: margin
  },
  // display
  displayPrint: {
    cssProperty: false,
    transform: (value) => ({
      "@media print": {
        display: value
      }
    })
  },
  display: {},
  overflow: {},
  textOverflow: {},
  visibility: {},
  whiteSpace: {},
  // flexbox
  flexBasis: {},
  flexDirection: {},
  flexWrap: {},
  justifyContent: {},
  alignItems: {},
  alignContent: {},
  order: {},
  flex: {},
  flexGrow: {},
  flexShrink: {},
  alignSelf: {},
  justifyItems: {},
  justifySelf: {},
  // grid
  gap: {
    style: gap
  },
  rowGap: {
    style: rowGap
  },
  columnGap: {
    style: columnGap
  },
  gridColumn: {},
  gridRow: {},
  gridAutoFlow: {},
  gridAutoColumns: {},
  gridAutoRows: {},
  gridTemplateColumns: {},
  gridTemplateRows: {},
  gridTemplateAreas: {},
  gridArea: {},
  // positions
  position: {},
  zIndex: {
    themeKey: "zIndex"
  },
  top: {},
  right: {},
  bottom: {},
  left: {},
  // shadows
  boxShadow: {
    themeKey: "shadows"
  },
  // sizing
  width: {
    transform: sizingTransform
  },
  maxWidth: {
    style: maxWidth
  },
  minWidth: {
    transform: sizingTransform
  },
  height: {
    transform: sizingTransform
  },
  maxHeight: {
    transform: sizingTransform
  },
  minHeight: {
    transform: sizingTransform
  },
  boxSizing: {},
  // typography
  fontFamily: {
    themeKey: "typography"
  },
  fontSize: {
    themeKey: "typography"
  },
  fontStyle: {
    themeKey: "typography"
  },
  fontWeight: {
    themeKey: "typography"
  },
  letterSpacing: {},
  textTransform: {},
  lineHeight: {},
  textAlign: {},
  typography: {
    cssProperty: false,
    themeKey: "typography"
  }
};
function objectsHaveSameKeys(...objects) {
  const allKeys = objects.reduce((keys, object) => keys.concat(Object.keys(object)), []);
  const union = new Set(allKeys);
  return objects.every((object) => union.size === Object.keys(object).length);
}
function callIfFn(maybeFn, arg) {
  return typeof maybeFn === "function" ? maybeFn(arg) : maybeFn;
}
function unstable_createStyleFunctionSx() {
  function getThemeValue(prop, val, theme, config) {
    const props = {
      [prop]: val,
      theme
    };
    const options = config[prop];
    if (!options) {
      return {
        [prop]: val
      };
    }
    const {
      cssProperty = prop,
      themeKey,
      transform,
      style: style2
    } = options;
    if (val == null) {
      return null;
    }
    if (themeKey === "typography" && val === "inherit") {
      return {
        [prop]: val
      };
    }
    const themeMapping = getPath(theme, themeKey) || {};
    if (style2) {
      return style2(props);
    }
    const styleFromPropValue = (propValueFinal) => {
      let value = getStyleValue$1(themeMapping, transform, propValueFinal);
      if (propValueFinal === value && typeof propValueFinal === "string") {
        value = getStyleValue$1(themeMapping, transform, `${prop}${propValueFinal === "default" ? "" : capitalize$1(propValueFinal)}`, propValueFinal);
      }
      if (cssProperty === false) {
        return value;
      }
      return {
        [cssProperty]: value
      };
    };
    return handleBreakpoints(props, val, styleFromPropValue);
  }
  function styleFunctionSx2(props) {
    var _theme$unstable_sxCon;
    const {
      sx,
      theme = {},
      nested: nested2
    } = props || {};
    if (!sx) {
      return null;
    }
    const config = (_theme$unstable_sxCon = theme.unstable_sxConfig) != null ? _theme$unstable_sxCon : defaultSxConfig;
    function traverse(sxInput) {
      let sxObject = sxInput;
      if (typeof sxInput === "function") {
        sxObject = sxInput(theme);
      } else if (typeof sxInput !== "object") {
        return sxInput;
      }
      if (!sxObject) {
        return null;
      }
      const emptyBreakpoints = createEmptyBreakpointObject(theme.breakpoints);
      const breakpointsKeys = Object.keys(emptyBreakpoints);
      let css2 = emptyBreakpoints;
      Object.keys(sxObject).forEach((styleKey) => {
        const value = callIfFn(sxObject[styleKey], theme);
        if (value !== null && value !== void 0) {
          if (typeof value === "object") {
            if (config[styleKey]) {
              css2 = merge(css2, getThemeValue(styleKey, value, theme, config));
            } else {
              const breakpointsValues = handleBreakpoints({
                theme
              }, value, (x) => ({
                [styleKey]: x
              }));
              if (objectsHaveSameKeys(breakpointsValues, value)) {
                css2[styleKey] = styleFunctionSx2({
                  sx: value,
                  theme,
                  nested: true
                });
              } else {
                css2 = merge(css2, breakpointsValues);
              }
            }
          } else {
            css2 = merge(css2, getThemeValue(styleKey, value, theme, config));
          }
        }
      });
      if (!nested2 && theme.modularCssLayers) {
        return {
          "@layer sx": removeUnusedBreakpoints(breakpointsKeys, css2)
        };
      }
      return removeUnusedBreakpoints(breakpointsKeys, css2);
    }
    return Array.isArray(sx) ? sx.map(traverse) : traverse(sx);
  }
  return styleFunctionSx2;
}
const styleFunctionSx$1 = unstable_createStyleFunctionSx();
styleFunctionSx$1.filterProps = ["sx"];
function applyStyles(key, styles2) {
  const theme = this;
  if (theme.vars && typeof theme.getColorSchemeSelector === "function") {
    const selector = theme.getColorSchemeSelector(key).replace(/(\[[^\]]+\])/, "*:where($1)");
    return {
      [selector]: styles2
    };
  }
  if (theme.palette.mode === key) {
    return styles2;
  }
  return {};
}
const _excluded$22 = ["breakpoints", "palette", "spacing", "shape"];
function createTheme$2(options = {}, ...args) {
  const {
    breakpoints: breakpointsInput = {},
    palette: paletteInput = {},
    spacing: spacingInput,
    shape: shapeInput = {}
  } = options, other = _objectWithoutPropertiesLoose(options, _excluded$22);
  const breakpoints = createBreakpoints(breakpointsInput);
  const spacing = createSpacing(spacingInput);
  let muiTheme = deepmerge$1({
    breakpoints,
    direction: "ltr",
    components: {},
    // Inject component definitions.
    palette: _extends({
      mode: "light"
    }, paletteInput),
    spacing,
    shape: _extends({}, shape, shapeInput)
  }, other);
  muiTheme.applyStyles = applyStyles;
  muiTheme = args.reduce((acc, argument) => deepmerge$1(acc, argument), muiTheme);
  muiTheme.unstable_sxConfig = _extends({}, defaultSxConfig, other == null ? void 0 : other.unstable_sxConfig);
  muiTheme.unstable_sx = function sx(props) {
    return styleFunctionSx$1({
      sx: props,
      theme: this
    });
  };
  return muiTheme;
}
const createTheme$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: createTheme$2,
  private_createBreakpoints: createBreakpoints,
  unstable_applyStyles: applyStyles
}, Symbol.toStringTag, { value: "Module" }));
function isObjectEmpty$1(obj) {
  return Object.keys(obj).length === 0;
}
function useTheme$4(defaultTheme2 = null) {
  const contextTheme = reactExports.useContext(ThemeContext$1);
  return !contextTheme || isObjectEmpty$1(contextTheme) ? defaultTheme2 : contextTheme;
}
const systemDefaultTheme$2 = createTheme$2();
function useTheme$3(defaultTheme2 = systemDefaultTheme$2) {
  return useTheme$4(defaultTheme2);
}
function wrapGlobalLayer(styles2) {
  const serialized = internal_serializeStyles(styles2);
  if (styles2 !== serialized && serialized.styles) {
    if (!serialized.styles.match(/^@layer\s+[^{]*$/)) {
      serialized.styles = `@layer global{${serialized.styles}}`;
    }
    return serialized;
  }
  return styles2;
}
function GlobalStyles$1({
  styles: styles2,
  themeId,
  defaultTheme: defaultTheme2 = {}
}) {
  const upperTheme = useTheme$3(defaultTheme2);
  const resolvedTheme = themeId ? upperTheme[themeId] || upperTheme : upperTheme;
  let globalStyles = typeof styles2 === "function" ? styles2(resolvedTheme) : styles2;
  if (resolvedTheme.modularCssLayers) {
    if (Array.isArray(globalStyles)) {
      globalStyles = globalStyles.map((styleArg) => {
        if (typeof styleArg === "function") {
          return wrapGlobalLayer(styleArg(resolvedTheme));
        }
        return wrapGlobalLayer(styleArg);
      });
    } else {
      globalStyles = wrapGlobalLayer(globalStyles);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalStyles$2, {
    styles: globalStyles
  });
}
const _excluded$21 = ["sx"];
const splitProps = (props) => {
  var _props$theme$unstable, _props$theme;
  const result = {
    systemProps: {},
    otherProps: {}
  };
  const config = (_props$theme$unstable = props == null || (_props$theme = props.theme) == null ? void 0 : _props$theme.unstable_sxConfig) != null ? _props$theme$unstable : defaultSxConfig;
  Object.keys(props).forEach((prop) => {
    if (config[prop]) {
      result.systemProps[prop] = props[prop];
    } else {
      result.otherProps[prop] = props[prop];
    }
  });
  return result;
};
function extendSxProp(props) {
  const {
    sx: inSx
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$21);
  const {
    systemProps,
    otherProps
  } = splitProps(other);
  let finalSx;
  if (Array.isArray(inSx)) {
    finalSx = [systemProps, ...inSx];
  } else if (typeof inSx === "function") {
    finalSx = (...args) => {
      const result = inSx(...args);
      if (!isPlainObject(result)) {
        return systemProps;
      }
      return _extends({}, systemProps, result);
    };
  } else {
    finalSx = _extends({}, systemProps, inSx);
  }
  return _extends({}, otherProps, {
    sx: finalSx
  });
}
const styleFunctionSx = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: styleFunctionSx$1,
  extendSxProp,
  unstable_createStyleFunctionSx,
  unstable_defaultSxConfig: defaultSxConfig
}, Symbol.toStringTag, { value: "Module" }));
const defaultGenerator = (componentName) => componentName;
const createClassNameGenerator = () => {
  let generate = defaultGenerator;
  return {
    configure(generator) {
      generate = generator;
    },
    generate(componentName) {
      return generate(componentName);
    },
    reset() {
      generate = defaultGenerator;
    }
  };
};
const ClassNameGenerator = createClassNameGenerator();
const _excluded$20 = ["className", "component"];
function createBox(options = {}) {
  const {
    themeId,
    defaultTheme: defaultTheme2,
    defaultClassName = "MuiBox-root",
    generateClassName
  } = options;
  const BoxRoot = styled$2("div", {
    shouldForwardProp: (prop) => prop !== "theme" && prop !== "sx" && prop !== "as"
  })(styleFunctionSx$1);
  const Box2 = /* @__PURE__ */ reactExports.forwardRef(function Box3(inProps, ref) {
    const theme = useTheme$3(defaultTheme2);
    const _extendSxProp = extendSxProp(inProps), {
      className,
      component = "div"
    } = _extendSxProp, other = _objectWithoutPropertiesLoose(_extendSxProp, _excluded$20);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(BoxRoot, _extends({
      as: component,
      ref,
      className: clsx(className, generateClassName ? generateClassName(defaultClassName) : defaultClassName),
      theme: themeId ? theme[themeId] || theme : theme
    }, other));
  });
  return Box2;
}
const globalStateClasses = {
  active: "active",
  checked: "checked",
  completed: "completed",
  disabled: "disabled",
  error: "error",
  expanded: "expanded",
  focused: "focused",
  focusVisible: "focusVisible",
  open: "open",
  readOnly: "readOnly",
  required: "required",
  selected: "selected"
};
function generateUtilityClass$2(componentName, slot, globalStatePrefix = "Mui") {
  const globalStateClass = globalStateClasses[slot];
  return globalStateClass ? `${globalStatePrefix}-${globalStateClass}` : `${ClassNameGenerator.generate(componentName)}-${slot}`;
}
function generateUtilityClasses(componentName, slots, globalStatePrefix = "Mui") {
  const result = {};
  slots.forEach((slot) => {
    result[slot] = generateUtilityClass$2(componentName, slot, globalStatePrefix);
  });
  return result;
}
const boxClasses$1 = generateUtilityClasses("MuiBox", ["root"]);
const Box$1 = createBox({
  defaultClassName: boxClasses$1.root,
  generateClassName: ClassNameGenerator.generate
});
const fnNameMatchRegex = /^\s*function(?:\s|\s*\/\*.*\*\/\s*)+([^(\s/]*)\s*/;
function getFunctionName(fn) {
  const match2 = `${fn}`.match(fnNameMatchRegex);
  const name = match2 && match2[1];
  return name || "";
}
function getFunctionComponentName(Component, fallback = "") {
  return Component.displayName || Component.name || getFunctionName(Component) || fallback;
}
function getWrappedName(outerType, innerType, wrapperName) {
  const functionName = getFunctionComponentName(innerType);
  return outerType.displayName || (functionName !== "" ? `${wrapperName}(${functionName})` : wrapperName);
}
function getDisplayName$1(Component) {
  if (Component == null) {
    return void 0;
  }
  if (typeof Component === "string") {
    return Component;
  }
  if (typeof Component === "function") {
    return getFunctionComponentName(Component, "Component");
  }
  if (typeof Component === "object") {
    switch (Component.$$typeof) {
      case reactIsExports.ForwardRef:
        return getWrappedName(Component, Component.render, "ForwardRef");
      case reactIsExports.Memo:
        return getWrappedName(Component, Component.type, "memo");
      default:
        return void 0;
    }
  }
  return void 0;
}
const getDisplayName = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: getDisplayName$1,
  getFunctionName
}, Symbol.toStringTag, { value: "Module" }));
const _excluded$1$ = ["ownerState"], _excluded2$d = ["variants"], _excluded3$3 = ["name", "slot", "skipVariantsResolver", "skipSx", "overridesResolver"];
function isEmpty$3(obj) {
  return Object.keys(obj).length === 0;
}
function isStringTag$1(tag) {
  return typeof tag === "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  tag.charCodeAt(0) > 96;
}
function shouldForwardProp$1(prop) {
  return prop !== "ownerState" && prop !== "theme" && prop !== "sx" && prop !== "as";
}
function shallowLayer$1(serialized, layerName) {
  if (layerName && serialized && typeof serialized === "object" && serialized.styles && !serialized.styles.startsWith("@layer")) {
    serialized.styles = `@layer ${layerName}{${String(serialized.styles)}}`;
  }
  return serialized;
}
const systemDefaultTheme$1 = createTheme$2();
const lowercaseFirstLetter$1 = (string) => {
  if (!string) {
    return string;
  }
  return string.charAt(0).toLowerCase() + string.slice(1);
};
function resolveTheme$1({
  defaultTheme: defaultTheme2,
  theme,
  themeId
}) {
  return isEmpty$3(theme) ? defaultTheme2 : theme[themeId] || theme;
}
function defaultOverridesResolver$1(slot) {
  if (!slot) {
    return null;
  }
  return (props, styles2) => styles2[slot];
}
function processStyleArg$1(callableStyle, _ref, layerName) {
  let {
    ownerState
  } = _ref, props = _objectWithoutPropertiesLoose(_ref, _excluded$1$);
  const resolvedStylesArg = typeof callableStyle === "function" ? callableStyle(_extends({
    ownerState
  }, props)) : callableStyle;
  if (Array.isArray(resolvedStylesArg)) {
    return resolvedStylesArg.flatMap((resolvedStyle) => processStyleArg$1(resolvedStyle, _extends({
      ownerState
    }, props), layerName));
  }
  if (!!resolvedStylesArg && typeof resolvedStylesArg === "object" && Array.isArray(resolvedStylesArg.variants)) {
    const {
      variants = []
    } = resolvedStylesArg, otherStyles = _objectWithoutPropertiesLoose(resolvedStylesArg, _excluded2$d);
    let result = otherStyles;
    variants.forEach((variant) => {
      let isMatch = true;
      if (typeof variant.props === "function") {
        isMatch = variant.props(_extends({
          ownerState
        }, props, ownerState));
      } else {
        Object.keys(variant.props).forEach((key) => {
          if ((ownerState == null ? void 0 : ownerState[key]) !== variant.props[key] && props[key] !== variant.props[key]) {
            isMatch = false;
          }
        });
      }
      if (isMatch) {
        if (!Array.isArray(result)) {
          result = [result];
        }
        const variantStyle = typeof variant.style === "function" ? variant.style(_extends({
          ownerState
        }, props, ownerState)) : variant.style;
        result.push(layerName ? shallowLayer$1(internal_serializeStyles(variantStyle), layerName) : variantStyle);
      }
    });
    return result;
  }
  return layerName ? shallowLayer$1(internal_serializeStyles(resolvedStylesArg), layerName) : resolvedStylesArg;
}
function createStyled$2(input = {}) {
  const {
    themeId,
    defaultTheme: defaultTheme2 = systemDefaultTheme$1,
    rootShouldForwardProp: rootShouldForwardProp2 = shouldForwardProp$1,
    slotShouldForwardProp: slotShouldForwardProp2 = shouldForwardProp$1
  } = input;
  const systemSx = (props) => {
    return styleFunctionSx$1(_extends({}, props, {
      theme: resolveTheme$1(_extends({}, props, {
        defaultTheme: defaultTheme2,
        themeId
      }))
    }));
  };
  systemSx.__mui_systemSx = true;
  return (tag, inputOptions = {}) => {
    internal_processStyles(tag, (styles2) => styles2.filter((style2) => !(style2 != null && style2.__mui_systemSx)));
    const {
      name: componentName,
      slot: componentSlot,
      skipVariantsResolver: inputSkipVariantsResolver,
      skipSx: inputSkipSx,
      // TODO v6: remove `lowercaseFirstLetter()` in the next major release
      // For more details: https://github.com/mui/material-ui/pull/37908
      overridesResolver: overridesResolver2 = defaultOverridesResolver$1(lowercaseFirstLetter$1(componentSlot))
    } = inputOptions, options = _objectWithoutPropertiesLoose(inputOptions, _excluded3$3);
    const layerName = componentName && componentName.startsWith("Mui") || !!componentSlot ? "components" : "custom";
    const skipVariantsResolver = inputSkipVariantsResolver !== void 0 ? inputSkipVariantsResolver : (
      // TODO v6: remove `Root` in the next major release
      // For more details: https://github.com/mui/material-ui/pull/37908
      componentSlot && componentSlot !== "Root" && componentSlot !== "root" || false
    );
    const skipSx = inputSkipSx || false;
    let label;
    let shouldForwardPropOption = shouldForwardProp$1;
    if (componentSlot === "Root" || componentSlot === "root") {
      shouldForwardPropOption = rootShouldForwardProp2;
    } else if (componentSlot) {
      shouldForwardPropOption = slotShouldForwardProp2;
    } else if (isStringTag$1(tag)) {
      shouldForwardPropOption = void 0;
    }
    const defaultStyledResolver = styled$2(tag, _extends({
      shouldForwardProp: shouldForwardPropOption,
      label
    }, options));
    const transformStyleArg = (stylesArg) => {
      if (typeof stylesArg === "function" && stylesArg.__emotion_real !== stylesArg || isPlainObject(stylesArg)) {
        return (props) => {
          const theme = resolveTheme$1({
            theme: props.theme,
            defaultTheme: defaultTheme2,
            themeId
          });
          return processStyleArg$1(stylesArg, _extends({}, props, {
            theme
          }), theme.modularCssLayers ? layerName : void 0);
        };
      }
      return stylesArg;
    };
    const muiStyledResolver = (styleArg, ...expressions) => {
      let transformedStyleArg = transformStyleArg(styleArg);
      const expressionsWithDefaultTheme = expressions ? expressions.map(transformStyleArg) : [];
      if (componentName && overridesResolver2) {
        expressionsWithDefaultTheme.push((props) => {
          const theme = resolveTheme$1(_extends({}, props, {
            defaultTheme: defaultTheme2,
            themeId
          }));
          if (!theme.components || !theme.components[componentName] || !theme.components[componentName].styleOverrides) {
            return null;
          }
          const styleOverrides = theme.components[componentName].styleOverrides;
          const resolvedStyleOverrides = {};
          Object.entries(styleOverrides).forEach(([slotKey, slotStyle]) => {
            resolvedStyleOverrides[slotKey] = processStyleArg$1(slotStyle, _extends({}, props, {
              theme
            }), theme.modularCssLayers ? "theme" : void 0);
          });
          return overridesResolver2(props, resolvedStyleOverrides);
        });
      }
      if (componentName && !skipVariantsResolver) {
        expressionsWithDefaultTheme.push((props) => {
          var _theme$components;
          const theme = resolveTheme$1(_extends({}, props, {
            defaultTheme: defaultTheme2,
            themeId
          }));
          const themeVariants = theme == null || (_theme$components = theme.components) == null || (_theme$components = _theme$components[componentName]) == null ? void 0 : _theme$components.variants;
          return processStyleArg$1({
            variants: themeVariants
          }, _extends({}, props, {
            theme
          }), theme.modularCssLayers ? "theme" : void 0);
        });
      }
      if (!skipSx) {
        expressionsWithDefaultTheme.push(systemSx);
      }
      const numOfCustomFnsApplied = expressionsWithDefaultTheme.length - expressions.length;
      if (Array.isArray(styleArg) && numOfCustomFnsApplied > 0) {
        const placeholders = new Array(numOfCustomFnsApplied).fill("");
        transformedStyleArg = [...styleArg, ...placeholders];
        transformedStyleArg.raw = [...styleArg.raw, ...placeholders];
      }
      const Component = defaultStyledResolver(transformedStyleArg, ...expressionsWithDefaultTheme);
      if (tag.muiName) {
        Component.muiName = tag.muiName;
      }
      return Component;
    };
    if (defaultStyledResolver.withConfig) {
      muiStyledResolver.withConfig = defaultStyledResolver.withConfig;
    }
    return muiStyledResolver;
  };
}
const styled$1 = createStyled$2();
function resolveProps(defaultProps, props) {
  const output = _extends({}, props);
  Object.keys(defaultProps).forEach((propName) => {
    if (propName.toString().match(/^(components|slots)$/)) {
      output[propName] = _extends({}, defaultProps[propName], output[propName]);
    } else if (propName.toString().match(/^(componentsProps|slotProps)$/)) {
      const defaultSlotProps = defaultProps[propName] || {};
      const slotProps = props[propName];
      output[propName] = {};
      if (!slotProps || !Object.keys(slotProps)) {
        output[propName] = defaultSlotProps;
      } else if (!defaultSlotProps || !Object.keys(defaultSlotProps)) {
        output[propName] = slotProps;
      } else {
        output[propName] = _extends({}, slotProps);
        Object.keys(defaultSlotProps).forEach((slotPropName) => {
          output[propName][slotPropName] = resolveProps(defaultSlotProps[slotPropName], slotProps[slotPropName]);
        });
      }
    } else if (output[propName] === void 0) {
      output[propName] = defaultProps[propName];
    }
  });
  return output;
}
function getThemeProps(params) {
  const {
    theme,
    name,
    props
  } = params;
  if (!theme || !theme.components || !theme.components[name] || !theme.components[name].defaultProps) {
    return props;
  }
  return resolveProps(theme.components[name].defaultProps, props);
}
function useThemeProps$b({
  props,
  name,
  defaultTheme: defaultTheme2,
  themeId
}) {
  let theme = useTheme$3(defaultTheme2);
  if (themeId) {
    theme = theme[themeId] || theme;
  }
  const mergedProps = getThemeProps({
    theme,
    name,
    props
  });
  return mergedProps;
}
const useEnhancedEffect = typeof window !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
function useMediaQueryOld(query, defaultMatches, matchMedia, ssrMatchMedia, noSsr) {
  const [match2, setMatch] = reactExports.useState(() => {
    if (noSsr && matchMedia) {
      return matchMedia(query).matches;
    }
    if (ssrMatchMedia) {
      return ssrMatchMedia(query).matches;
    }
    return defaultMatches;
  });
  useEnhancedEffect(() => {
    let active = true;
    if (!matchMedia) {
      return void 0;
    }
    const queryList = matchMedia(query);
    const updateMatch = () => {
      if (active) {
        setMatch(queryList.matches);
      }
    };
    updateMatch();
    queryList.addListener(updateMatch);
    return () => {
      active = false;
      queryList.removeListener(updateMatch);
    };
  }, [query, matchMedia]);
  return match2;
}
const maybeReactUseSyncExternalStore = reactExports.useSyncExternalStore;
function useMediaQueryNew(query, defaultMatches, matchMedia, ssrMatchMedia, noSsr) {
  const getDefaultSnapshot = reactExports.useCallback(() => defaultMatches, [defaultMatches]);
  const getServerSnapshot = reactExports.useMemo(() => {
    if (noSsr && matchMedia) {
      return () => matchMedia(query).matches;
    }
    if (ssrMatchMedia !== null) {
      const {
        matches
      } = ssrMatchMedia(query);
      return () => matches;
    }
    return getDefaultSnapshot;
  }, [getDefaultSnapshot, query, ssrMatchMedia, noSsr, matchMedia]);
  const [getSnapshot, subscribe] = reactExports.useMemo(() => {
    if (matchMedia === null) {
      return [getDefaultSnapshot, () => () => {
      }];
    }
    const mediaQueryList = matchMedia(query);
    return [() => mediaQueryList.matches, (notify) => {
      mediaQueryList.addListener(notify);
      return () => {
        mediaQueryList.removeListener(notify);
      };
    }];
  }, [getDefaultSnapshot, matchMedia, query]);
  const match2 = maybeReactUseSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return match2;
}
function useMediaQuery(queryInput, options = {}) {
  const theme = useTheme$4();
  const supportMatchMedia = typeof window !== "undefined" && typeof window.matchMedia !== "undefined";
  const {
    defaultMatches = false,
    matchMedia = supportMatchMedia ? window.matchMedia : null,
    ssrMatchMedia = null,
    noSsr = false
  } = getThemeProps({
    name: "MuiUseMediaQuery",
    props: options,
    theme
  });
  let query = typeof queryInput === "function" ? queryInput(theme) : queryInput;
  query = query.replace(/^@media( ?)/m, "");
  const useMediaQueryImplementation = maybeReactUseSyncExternalStore !== void 0 ? useMediaQueryNew : useMediaQueryOld;
  const match2 = useMediaQueryImplementation(query, defaultMatches, matchMedia, ssrMatchMedia, noSsr);
  return match2;
}
function clamp$1(val, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(val, max));
}
const clamp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: clamp$1
}, Symbol.toStringTag, { value: "Module" }));
function clampWrapper$1(value, min = 0, max = 1) {
  return clamp$1(value, min, max);
}
function hexToRgb$1(color2) {
  color2 = color2.slice(1);
  const re = new RegExp(`.{1,${color2.length >= 6 ? 2 : 1}}`, "g");
  let colors = color2.match(re);
  if (colors && colors[0].length === 1) {
    colors = colors.map((n2) => n2 + n2);
  }
  return colors ? `rgb${colors.length === 4 ? "a" : ""}(${colors.map((n2, index) => {
    return index < 3 ? parseInt(n2, 16) : Math.round(parseInt(n2, 16) / 255 * 1e3) / 1e3;
  }).join(", ")})` : "";
}
function decomposeColor$1(color2) {
  if (color2.type) {
    return color2;
  }
  if (color2.charAt(0) === "#") {
    return decomposeColor$1(hexToRgb$1(color2));
  }
  const marker = color2.indexOf("(");
  const type = color2.substring(0, marker);
  if (["rgb", "rgba", "hsl", "hsla", "color"].indexOf(type) === -1) {
    throw new Error(formatMuiErrorMessage$1(9, color2));
  }
  let values2 = color2.substring(marker + 1, color2.length - 1);
  let colorSpace;
  if (type === "color") {
    values2 = values2.split(" ");
    colorSpace = values2.shift();
    if (values2.length === 4 && values2[3].charAt(0) === "/") {
      values2[3] = values2[3].slice(1);
    }
    if (["srgb", "display-p3", "a98-rgb", "prophoto-rgb", "rec-2020"].indexOf(colorSpace) === -1) {
      throw new Error(formatMuiErrorMessage$1(10, colorSpace));
    }
  } else {
    values2 = values2.split(",");
  }
  values2 = values2.map((value) => parseFloat(value));
  return {
    type,
    values: values2,
    colorSpace
  };
}
function recomposeColor$1(color2) {
  const {
    type,
    colorSpace
  } = color2;
  let {
    values: values2
  } = color2;
  if (type.indexOf("rgb") !== -1) {
    values2 = values2.map((n2, i) => i < 3 ? parseInt(n2, 10) : n2);
  } else if (type.indexOf("hsl") !== -1) {
    values2[1] = `${values2[1]}%`;
    values2[2] = `${values2[2]}%`;
  }
  if (type.indexOf("color") !== -1) {
    values2 = `${colorSpace} ${values2.join(" ")}`;
  } else {
    values2 = `${values2.join(", ")}`;
  }
  return `${type}(${values2})`;
}
function alpha$1(color2, value) {
  color2 = decomposeColor$1(color2);
  value = clampWrapper$1(value);
  if (color2.type === "rgb" || color2.type === "hsl") {
    color2.type += "a";
  }
  if (color2.type === "color") {
    color2.values[3] = `/${value}`;
  } else {
    color2.values[3] = value;
  }
  return recomposeColor$1(color2);
}
function createChainedFunction(...funcs) {
  return funcs.reduce((acc, func) => {
    if (func == null) {
      return acc;
    }
    return function chainedFunction(...args) {
      acc.apply(this, args);
      func.apply(this, args);
    };
  }, () => {
  });
}
function debounce(func, wait = 166) {
  let timeout;
  function debounced(...args) {
    const later = () => {
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
  debounced.clear = () => {
    clearTimeout(timeout);
  };
  return debounced;
}
function deprecatedPropType(validator, reason) {
  {
    return () => null;
  }
}
function isMuiElement(element, muiNames) {
  var _muiName, _element$type;
  return /* @__PURE__ */ reactExports.isValidElement(element) && muiNames.indexOf(
    // For server components `muiName` is avaialble in element.type._payload.value.muiName
    // relevant info - https://github.com/facebook/react/blob/2807d781a08db8e9873687fccc25c0f12b4fb3d4/packages/react/src/ReactLazy.js#L45
    // eslint-disable-next-line no-underscore-dangle
    (_muiName = element.type.muiName) != null ? _muiName : (_element$type = element.type) == null || (_element$type = _element$type._payload) == null || (_element$type = _element$type.value) == null ? void 0 : _element$type.muiName
  ) !== -1;
}
function ownerDocument(node) {
  return node && node.ownerDocument || document;
}
function ownerWindow(node) {
  const doc = ownerDocument(node);
  return doc.defaultView || window;
}
function requirePropFactory(componentNameInError, Component) {
  {
    return () => null;
  }
}
function setRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
let globalId = 0;
function useGlobalId(idOverride) {
  const [defaultId, setDefaultId] = reactExports.useState(idOverride);
  const id = idOverride || defaultId;
  reactExports.useEffect(() => {
    if (defaultId == null) {
      globalId += 1;
      setDefaultId(`mui-${globalId}`);
    }
  }, [defaultId]);
  return id;
}
const maybeReactUseId = React$1["useId".toString()];
function useId(idOverride) {
  if (maybeReactUseId !== void 0) {
    const reactId = maybeReactUseId();
    return idOverride != null ? idOverride : reactId;
  }
  return useGlobalId(idOverride);
}
function unsupportedProp(props, propName, componentName, location, propFullName) {
  {
    return null;
  }
}
function useControlled({
  controlled,
  default: defaultProp,
  name,
  state = "value"
}) {
  const {
    current: isControlled
  } = reactExports.useRef(controlled !== void 0);
  const [valueState, setValue] = reactExports.useState(defaultProp);
  const value = isControlled ? controlled : valueState;
  const setValueIfUncontrolled = reactExports.useCallback((newValue) => {
    if (!isControlled) {
      setValue(newValue);
    }
  }, []);
  return [value, setValueIfUncontrolled];
}
function useEventCallback(fn) {
  const ref = reactExports.useRef(fn);
  useEnhancedEffect(() => {
    ref.current = fn;
  });
  return reactExports.useRef((...args) => (
    // @ts-expect-error hide `this`
    (0, ref.current)(...args)
  )).current;
}
function useForkRef(...refs) {
  return reactExports.useMemo(() => {
    if (refs.every((ref) => ref == null)) {
      return null;
    }
    return (instance) => {
      refs.forEach((ref) => {
        setRef(ref, instance);
      });
    };
  }, refs);
}
const UNINITIALIZED = {};
function useLazyRef(init, initArg) {
  const ref = reactExports.useRef(UNINITIALIZED);
  if (ref.current === UNINITIALIZED) {
    ref.current = init(initArg);
  }
  return ref;
}
const EMPTY = [];
function useOnMount(fn) {
  reactExports.useEffect(fn, EMPTY);
}
class Timeout {
  constructor() {
    this.currentId = null;
    this.clear = () => {
      if (this.currentId !== null) {
        clearTimeout(this.currentId);
        this.currentId = null;
      }
    };
    this.disposeEffect = () => {
      return this.clear;
    };
  }
  static create() {
    return new Timeout();
  }
  /**
   * Executes `fn` after `delay`, clearing any previously scheduled call.
   */
  start(delay, fn) {
    this.clear();
    this.currentId = setTimeout(() => {
      this.currentId = null;
      fn();
    }, delay);
  }
}
function useTimeout() {
  const timeout = useLazyRef(Timeout.create).current;
  useOnMount(timeout.disposeEffect);
  return timeout;
}
let hadKeyboardEvent = true;
let hadFocusVisibleRecently = false;
const hadFocusVisibleRecentlyTimeout = new Timeout();
const inputTypesWhitelist = {
  text: true,
  search: true,
  url: true,
  tel: true,
  email: true,
  password: true,
  number: true,
  date: true,
  month: true,
  week: true,
  time: true,
  datetime: true,
  "datetime-local": true
};
function focusTriggersKeyboardModality(node) {
  const {
    type,
    tagName
  } = node;
  if (tagName === "INPUT" && inputTypesWhitelist[type] && !node.readOnly) {
    return true;
  }
  if (tagName === "TEXTAREA" && !node.readOnly) {
    return true;
  }
  if (node.isContentEditable) {
    return true;
  }
  return false;
}
function handleKeyDown(event) {
  if (event.metaKey || event.altKey || event.ctrlKey) {
    return;
  }
  hadKeyboardEvent = true;
}
function handlePointerDown() {
  hadKeyboardEvent = false;
}
function handleVisibilityChange() {
  if (this.visibilityState === "hidden") {
    if (hadFocusVisibleRecently) {
      hadKeyboardEvent = true;
    }
  }
}
function prepare(doc) {
  doc.addEventListener("keydown", handleKeyDown, true);
  doc.addEventListener("mousedown", handlePointerDown, true);
  doc.addEventListener("pointerdown", handlePointerDown, true);
  doc.addEventListener("touchstart", handlePointerDown, true);
  doc.addEventListener("visibilitychange", handleVisibilityChange, true);
}
function isFocusVisible(event) {
  const {
    target
  } = event;
  try {
    return target.matches(":focus-visible");
  } catch (error) {
  }
  return hadKeyboardEvent || focusTriggersKeyboardModality(target);
}
function useIsFocusVisible() {
  const ref = reactExports.useCallback((node) => {
    if (node != null) {
      prepare(node.ownerDocument);
    }
  }, []);
  const isFocusVisibleRef = reactExports.useRef(false);
  function handleBlurVisible() {
    if (isFocusVisibleRef.current) {
      hadFocusVisibleRecently = true;
      hadFocusVisibleRecentlyTimeout.start(100, () => {
        hadFocusVisibleRecently = false;
      });
      isFocusVisibleRef.current = false;
      return true;
    }
    return false;
  }
  function handleFocusVisible(event) {
    if (isFocusVisible(event)) {
      isFocusVisibleRef.current = true;
      return true;
    }
    return false;
  }
  return {
    isFocusVisibleRef,
    onFocus: handleFocusVisible,
    onBlur: handleBlurVisible,
    ref
  };
}
function getScrollbarSize(doc) {
  const documentWidth = doc.documentElement.clientWidth;
  return Math.abs(window.innerWidth - documentWidth);
}
let cachedType;
function detectScrollType() {
  if (cachedType) {
    return cachedType;
  }
  const dummy = document.createElement("div");
  const container = document.createElement("div");
  container.style.width = "10px";
  container.style.height = "1px";
  dummy.appendChild(container);
  dummy.dir = "rtl";
  dummy.style.fontSize = "14px";
  dummy.style.width = "4px";
  dummy.style.height = "1px";
  dummy.style.position = "absolute";
  dummy.style.top = "-1000px";
  dummy.style.overflow = "scroll";
  document.body.appendChild(dummy);
  cachedType = "reverse";
  if (dummy.scrollLeft > 0) {
    cachedType = "default";
  } else {
    dummy.scrollLeft = 1;
    if (dummy.scrollLeft === 0) {
      cachedType = "negative";
    }
  }
  document.body.removeChild(dummy);
  return cachedType;
}
function getNormalizedScrollLeft(element, direction) {
  const scrollLeft = element.scrollLeft;
  if (direction !== "rtl") {
    return scrollLeft;
  }
  const type = detectScrollType();
  switch (type) {
    case "negative":
      return element.scrollWidth - element.clientWidth + scrollLeft;
    case "reverse":
      return element.scrollWidth - element.clientWidth - scrollLeft;
    default:
      return scrollLeft;
  }
}
const usePreviousProps = (value) => {
  const ref = reactExports.useRef({});
  reactExports.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
function getValidReactChildren(children) {
  return reactExports.Children.toArray(children).filter((child) => /* @__PURE__ */ reactExports.isValidElement(child));
}
const visuallyHidden = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px"
};
function composeClasses(slots, getUtilityClass, classes = void 0) {
  const output = {};
  Object.keys(slots).forEach(
    // `Object.keys(slots)` can't be wider than `T` because we infer `T` from `slots`.
    // @ts-expect-error https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
    (slot) => {
      output[slot] = slots[slot].reduce((acc, key) => {
        if (key) {
          const utilityClass = getUtilityClass(key);
          if (utilityClass !== "") {
            acc.push(utilityClass);
          }
          if (classes && classes[key]) {
            acc.push(classes[key]);
          }
        }
        return acc;
      }, []).join(" ");
    }
  );
  return output;
}
function isHostComponent$1(element) {
  return typeof element === "string";
}
function appendOwnerState$1(elementType, otherProps, ownerState) {
  if (elementType === void 0 || isHostComponent$1(elementType)) {
    return otherProps;
  }
  return _extends({}, otherProps, {
    ownerState: _extends({}, otherProps.ownerState, ownerState)
  });
}
function extractEventHandlers$1(object, excludeKeys = []) {
  if (object === void 0) {
    return {};
  }
  const result = {};
  Object.keys(object).filter((prop) => prop.match(/^on[A-Z]/) && typeof object[prop] === "function" && !excludeKeys.includes(prop)).forEach((prop) => {
    result[prop] = object[prop];
  });
  return result;
}
function omitEventHandlers$1(object) {
  if (object === void 0) {
    return {};
  }
  const result = {};
  Object.keys(object).filter((prop) => !(prop.match(/^on[A-Z]/) && typeof object[prop] === "function")).forEach((prop) => {
    result[prop] = object[prop];
  });
  return result;
}
function mergeSlotProps$1(parameters) {
  const {
    getSlotProps,
    additionalProps,
    externalSlotProps,
    externalForwardedProps,
    className
  } = parameters;
  if (!getSlotProps) {
    const joinedClasses2 = clsx(additionalProps == null ? void 0 : additionalProps.className, className, externalForwardedProps == null ? void 0 : externalForwardedProps.className, externalSlotProps == null ? void 0 : externalSlotProps.className);
    const mergedStyle2 = _extends({}, additionalProps == null ? void 0 : additionalProps.style, externalForwardedProps == null ? void 0 : externalForwardedProps.style, externalSlotProps == null ? void 0 : externalSlotProps.style);
    const props2 = _extends({}, additionalProps, externalForwardedProps, externalSlotProps);
    if (joinedClasses2.length > 0) {
      props2.className = joinedClasses2;
    }
    if (Object.keys(mergedStyle2).length > 0) {
      props2.style = mergedStyle2;
    }
    return {
      props: props2,
      internalRef: void 0
    };
  }
  const eventHandlers = extractEventHandlers$1(_extends({}, externalForwardedProps, externalSlotProps));
  const componentsPropsWithoutEventHandlers = omitEventHandlers$1(externalSlotProps);
  const otherPropsWithoutEventHandlers = omitEventHandlers$1(externalForwardedProps);
  const internalSlotProps = getSlotProps(eventHandlers);
  const joinedClasses = clsx(internalSlotProps == null ? void 0 : internalSlotProps.className, additionalProps == null ? void 0 : additionalProps.className, className, externalForwardedProps == null ? void 0 : externalForwardedProps.className, externalSlotProps == null ? void 0 : externalSlotProps.className);
  const mergedStyle = _extends({}, internalSlotProps == null ? void 0 : internalSlotProps.style, additionalProps == null ? void 0 : additionalProps.style, externalForwardedProps == null ? void 0 : externalForwardedProps.style, externalSlotProps == null ? void 0 : externalSlotProps.style);
  const props = _extends({}, internalSlotProps, additionalProps, otherPropsWithoutEventHandlers, componentsPropsWithoutEventHandlers);
  if (joinedClasses.length > 0) {
    props.className = joinedClasses;
  }
  if (Object.keys(mergedStyle).length > 0) {
    props.style = mergedStyle;
  }
  return {
    props,
    internalRef: internalSlotProps.ref
  };
}
function resolveComponentProps$1(componentProps, ownerState, slotState) {
  if (typeof componentProps === "function") {
    return componentProps(ownerState, slotState);
  }
  return componentProps;
}
const _excluded$1_ = ["elementType", "externalSlotProps", "ownerState", "skipResolvingSlotProps"];
function useSlotProps$1(parameters) {
  var _parameters$additiona;
  const {
    elementType,
    externalSlotProps,
    ownerState,
    skipResolvingSlotProps = false
  } = parameters, rest = _objectWithoutPropertiesLoose(parameters, _excluded$1_);
  const resolvedComponentsProps = skipResolvingSlotProps ? {} : resolveComponentProps$1(externalSlotProps, ownerState);
  const {
    props: mergedProps,
    internalRef
  } = mergeSlotProps$1(_extends({}, rest, {
    externalSlotProps: resolvedComponentsProps
  }));
  const ref = useForkRef(internalRef, resolvedComponentsProps == null ? void 0 : resolvedComponentsProps.ref, (_parameters$additiona = parameters.additionalProps) == null ? void 0 : _parameters$additiona.ref);
  const props = appendOwnerState$1(elementType, _extends({}, mergedProps, {
    ref
  }), ownerState);
  return props;
}
function getReactElementRef(element) {
  if (parseInt(reactExports.version, 10) >= 19) {
    var _element$props;
    return (element == null || (_element$props = element.props) == null ? void 0 : _element$props.ref) || null;
  }
  return (element == null ? void 0 : element.ref) || null;
}
const ThemeContext = /* @__PURE__ */ reactExports.createContext(null);
function useTheme$2() {
  const theme = reactExports.useContext(ThemeContext);
  return theme;
}
const hasSymbol = typeof Symbol === "function" && Symbol.for;
const nested = hasSymbol ? Symbol.for("mui.nested") : "__THEME_NESTED__";
function mergeOuterLocalTheme(outerTheme, localTheme) {
  if (typeof localTheme === "function") {
    const mergedTheme = localTheme(outerTheme);
    return mergedTheme;
  }
  return _extends({}, outerTheme, localTheme);
}
function ThemeProvider$2(props) {
  const {
    children,
    theme: localTheme
  } = props;
  const outerTheme = useTheme$2();
  const theme = reactExports.useMemo(() => {
    const output = outerTheme === null ? localTheme : mergeOuterLocalTheme(outerTheme, localTheme);
    if (output != null) {
      output[nested] = outerTheme !== null;
    }
    return output;
  }, [localTheme, outerTheme]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeContext.Provider, {
    value: theme,
    children
  });
}
const _excluded$1Z = ["value"];
const RtlContext = /* @__PURE__ */ reactExports.createContext();
function RtlProvider(_ref) {
  let {
    value
  } = _ref, props = _objectWithoutPropertiesLoose(_ref, _excluded$1Z);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RtlContext.Provider, _extends({
    value: value != null ? value : true
  }, props));
}
const useRtl = () => {
  const value = reactExports.useContext(RtlContext);
  return value != null ? value : false;
};
const PropsContext = /* @__PURE__ */ reactExports.createContext(void 0);
function DefaultPropsProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PropsContext.Provider, {
    value,
    children
  });
}
function useLayerOrder(theme) {
  const upperTheme = useTheme$4();
  const id = useId() || "";
  const {
    modularCssLayers
  } = theme;
  let layerOrder = "mui.global, mui.components, mui.theme, mui.custom, mui.sx";
  if (!modularCssLayers || upperTheme !== null) {
    layerOrder = "";
  } else if (typeof modularCssLayers === "string") {
    layerOrder = modularCssLayers.replace(/mui(?!\.)/g, layerOrder);
  } else {
    layerOrder = `@layer ${layerOrder};`;
  }
  useEnhancedEffect(() => {
    const head = document.querySelector("head");
    if (!head) {
      return;
    }
    const firstChild = head.firstChild;
    if (layerOrder) {
      var _firstChild$hasAttrib;
      if (firstChild && (_firstChild$hasAttrib = firstChild.hasAttribute) != null && _firstChild$hasAttrib.call(firstChild, "data-mui-layer-order") && firstChild.getAttribute("data-mui-layer-order") === id) {
        return;
      }
      const styleElement = document.createElement("style");
      styleElement.setAttribute("data-mui-layer-order", id);
      styleElement.textContent = layerOrder;
      head.prepend(styleElement);
    } else {
      var _head$querySelector;
      (_head$querySelector = head.querySelector(`style[data-mui-layer-order="${id}"]`)) == null || _head$querySelector.remove();
    }
  }, [layerOrder, id]);
  if (!layerOrder) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalStyles$1, {
    styles: layerOrder
  });
}
const EMPTY_THEME = {};
function useThemeScoping(themeId, upperTheme, localTheme, isPrivate = false) {
  return reactExports.useMemo(() => {
    const resolvedTheme = themeId ? upperTheme[themeId] || upperTheme : upperTheme;
    if (typeof localTheme === "function") {
      const mergedTheme = localTheme(resolvedTheme);
      const result = themeId ? _extends({}, upperTheme, {
        [themeId]: mergedTheme
      }) : mergedTheme;
      if (isPrivate) {
        return () => result;
      }
      return result;
    }
    return themeId ? _extends({}, upperTheme, {
      [themeId]: localTheme
    }) : _extends({}, upperTheme, localTheme);
  }, [themeId, upperTheme, localTheme, isPrivate]);
}
function ThemeProvider$1(props) {
  const {
    children,
    theme: localTheme,
    themeId
  } = props;
  const upperTheme = useTheme$4(EMPTY_THEME);
  const upperPrivateTheme = useTheme$2() || EMPTY_THEME;
  const engineTheme = useThemeScoping(themeId, upperTheme, localTheme);
  const privateTheme = useThemeScoping(themeId, upperPrivateTheme, localTheme, true);
  const rtlValue = engineTheme.direction === "rtl";
  const layerOrder = useLayerOrder(engineTheme);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeProvider$2, {
    theme: privateTheme,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeContext$1.Provider, {
      value: engineTheme,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(RtlProvider, {
        value: rtlValue,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DefaultPropsProvider, {
          value: engineTheme == null ? void 0 : engineTheme.components,
          children: [layerOrder, children]
        })
      })
    })
  });
}
const _excluded$1Y = ["component", "direction", "spacing", "divider", "children", "className", "useFlexGap"];
const defaultTheme$2 = createTheme$2();
const defaultCreateStyledComponent = styled$1("div", {
  name: "MuiStack",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
});
function useThemePropsDefault(props) {
  return useThemeProps$b({
    props,
    name: "MuiStack",
    defaultTheme: defaultTheme$2
  });
}
function joinChildren(children, separator) {
  const childrenArray = reactExports.Children.toArray(children).filter(Boolean);
  return childrenArray.reduce((output, child, index) => {
    output.push(child);
    if (index < childrenArray.length - 1) {
      output.push(/* @__PURE__ */ reactExports.cloneElement(separator, {
        key: `separator-${index}`
      }));
    }
    return output;
  }, []);
}
const getSideFromDirection = (direction) => {
  return {
    row: "Left",
    "row-reverse": "Right",
    column: "Top",
    "column-reverse": "Bottom"
  }[direction];
};
const style = ({
  ownerState,
  theme
}) => {
  let styles2 = _extends({
    display: "flex",
    flexDirection: "column"
  }, handleBreakpoints({
    theme
  }, resolveBreakpointValues({
    values: ownerState.direction,
    breakpoints: theme.breakpoints.values
  }), (propValue) => ({
    flexDirection: propValue
  })));
  if (ownerState.spacing) {
    const transformer = createUnarySpacing(theme);
    const base = Object.keys(theme.breakpoints.values).reduce((acc, breakpoint) => {
      if (typeof ownerState.spacing === "object" && ownerState.spacing[breakpoint] != null || typeof ownerState.direction === "object" && ownerState.direction[breakpoint] != null) {
        acc[breakpoint] = true;
      }
      return acc;
    }, {});
    const directionValues = resolveBreakpointValues({
      values: ownerState.direction,
      base
    });
    const spacingValues = resolveBreakpointValues({
      values: ownerState.spacing,
      base
    });
    if (typeof directionValues === "object") {
      Object.keys(directionValues).forEach((breakpoint, index, breakpoints) => {
        const directionValue = directionValues[breakpoint];
        if (!directionValue) {
          const previousDirectionValue = index > 0 ? directionValues[breakpoints[index - 1]] : "column";
          directionValues[breakpoint] = previousDirectionValue;
        }
      });
    }
    const styleFromPropValue = (propValue, breakpoint) => {
      if (ownerState.useFlexGap) {
        return {
          gap: getValue(transformer, propValue)
        };
      }
      return {
        // The useFlexGap={false} implement relies on each child to give up control of the margin.
        // We need to reset the margin to avoid double spacing.
        "& > :not(style):not(style)": {
          margin: 0
        },
        "& > :not(style) ~ :not(style)": {
          [`margin${getSideFromDirection(breakpoint ? directionValues[breakpoint] : ownerState.direction)}`]: getValue(transformer, propValue)
        }
      };
    };
    styles2 = deepmerge$1(styles2, handleBreakpoints({
      theme
    }, spacingValues, styleFromPropValue));
  }
  styles2 = mergeBreakpointsInOrder(theme.breakpoints, styles2);
  return styles2;
};
function createStack(options = {}) {
  const {
    // This will allow adding custom styled fn (for example for custom sx style function)
    createStyledComponent = defaultCreateStyledComponent,
    useThemeProps: useThemeProps2 = useThemePropsDefault,
    componentName = "MuiStack"
  } = options;
  const useUtilityClasses2 = () => {
    const slots = {
      root: ["root"]
    };
    return composeClasses(slots, (slot) => generateUtilityClass$2(componentName, slot), {});
  };
  const StackRoot = createStyledComponent(style);
  const Stack2 = /* @__PURE__ */ reactExports.forwardRef(function Grid3(inProps, ref) {
    const themeProps = useThemeProps2(inProps);
    const props = extendSxProp(themeProps);
    const {
      component = "div",
      direction = "column",
      spacing = 0,
      divider,
      children,
      className,
      useFlexGap = false
    } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1Y);
    const ownerState = {
      direction,
      spacing,
      useFlexGap
    };
    const classes = useUtilityClasses2();
    return /* @__PURE__ */ jsxRuntimeExports.jsx(StackRoot, _extends({
      as: component,
      ownerState,
      ref,
      className: clsx(classes.root, className)
    }, other, {
      children: divider ? joinChildren(children, divider) : children
    }));
  });
  return Stack2;
}
function createMixins(breakpoints, mixins) {
  return _extends({
    toolbar: {
      minHeight: 56,
      [breakpoints.up("xs")]: {
        "@media (orientation: landscape)": {
          minHeight: 48
        }
      },
      [breakpoints.up("sm")]: {
        minHeight: 64
      }
    }
  }, mixins);
}
var colorManipulator = {};
const require$$1$1 = /* @__PURE__ */ getAugmentedNamespace(formatMuiErrorMessage);
const require$$2 = /* @__PURE__ */ getAugmentedNamespace(clamp);
var _interopRequireDefault$Y = interopRequireDefaultExports;
Object.defineProperty(colorManipulator, "__esModule", {
  value: true
});
var alpha_1 = colorManipulator.alpha = alpha;
colorManipulator.blend = blend;
colorManipulator.colorChannel = void 0;
var darken_1 = colorManipulator.darken = darken;
colorManipulator.decomposeColor = decomposeColor;
var emphasize_1 = colorManipulator.emphasize = emphasize;
var getContrastRatio_1 = colorManipulator.getContrastRatio = getContrastRatio;
colorManipulator.getLuminance = getLuminance;
colorManipulator.hexToRgb = hexToRgb;
colorManipulator.hslToRgb = hslToRgb;
var lighten_1 = colorManipulator.lighten = lighten;
colorManipulator.private_safeAlpha = private_safeAlpha;
colorManipulator.private_safeColorChannel = void 0;
colorManipulator.private_safeDarken = private_safeDarken;
colorManipulator.private_safeEmphasize = private_safeEmphasize;
colorManipulator.private_safeLighten = private_safeLighten;
colorManipulator.recomposeColor = recomposeColor;
colorManipulator.rgbToHex = rgbToHex;
var _formatMuiErrorMessage2 = _interopRequireDefault$Y(require$$1$1);
var _clamp = _interopRequireDefault$Y(require$$2);
function clampWrapper(value, min = 0, max = 1) {
  return (0, _clamp.default)(value, min, max);
}
function hexToRgb(color2) {
  color2 = color2.slice(1);
  const re = new RegExp(`.{1,${color2.length >= 6 ? 2 : 1}}`, "g");
  let colors = color2.match(re);
  if (colors && colors[0].length === 1) {
    colors = colors.map((n2) => n2 + n2);
  }
  return colors ? `rgb${colors.length === 4 ? "a" : ""}(${colors.map((n2, index) => {
    return index < 3 ? parseInt(n2, 16) : Math.round(parseInt(n2, 16) / 255 * 1e3) / 1e3;
  }).join(", ")})` : "";
}
function intToHex(int) {
  const hex = int.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}
function decomposeColor(color2) {
  if (color2.type) {
    return color2;
  }
  if (color2.charAt(0) === "#") {
    return decomposeColor(hexToRgb(color2));
  }
  const marker = color2.indexOf("(");
  const type = color2.substring(0, marker);
  if (["rgb", "rgba", "hsl", "hsla", "color"].indexOf(type) === -1) {
    throw new Error((0, _formatMuiErrorMessage2.default)(9, color2));
  }
  let values2 = color2.substring(marker + 1, color2.length - 1);
  let colorSpace;
  if (type === "color") {
    values2 = values2.split(" ");
    colorSpace = values2.shift();
    if (values2.length === 4 && values2[3].charAt(0) === "/") {
      values2[3] = values2[3].slice(1);
    }
    if (["srgb", "display-p3", "a98-rgb", "prophoto-rgb", "rec-2020"].indexOf(colorSpace) === -1) {
      throw new Error((0, _formatMuiErrorMessage2.default)(10, colorSpace));
    }
  } else {
    values2 = values2.split(",");
  }
  values2 = values2.map((value) => parseFloat(value));
  return {
    type,
    values: values2,
    colorSpace
  };
}
const colorChannel = (color2) => {
  const decomposedColor = decomposeColor(color2);
  return decomposedColor.values.slice(0, 3).map((val, idx) => decomposedColor.type.indexOf("hsl") !== -1 && idx !== 0 ? `${val}%` : val).join(" ");
};
colorManipulator.colorChannel = colorChannel;
const private_safeColorChannel = (color2, warning) => {
  try {
    return colorChannel(color2);
  } catch (error) {
    return color2;
  }
};
colorManipulator.private_safeColorChannel = private_safeColorChannel;
function recomposeColor(color2) {
  const {
    type,
    colorSpace
  } = color2;
  let {
    values: values2
  } = color2;
  if (type.indexOf("rgb") !== -1) {
    values2 = values2.map((n2, i) => i < 3 ? parseInt(n2, 10) : n2);
  } else if (type.indexOf("hsl") !== -1) {
    values2[1] = `${values2[1]}%`;
    values2[2] = `${values2[2]}%`;
  }
  if (type.indexOf("color") !== -1) {
    values2 = `${colorSpace} ${values2.join(" ")}`;
  } else {
    values2 = `${values2.join(", ")}`;
  }
  return `${type}(${values2})`;
}
function rgbToHex(color2) {
  if (color2.indexOf("#") === 0) {
    return color2;
  }
  const {
    values: values2
  } = decomposeColor(color2);
  return `#${values2.map((n2, i) => intToHex(i === 3 ? Math.round(255 * n2) : n2)).join("")}`;
}
function hslToRgb(color2) {
  color2 = decomposeColor(color2);
  const {
    values: values2
  } = color2;
  const h2 = values2[0];
  const s = values2[1] / 100;
  const l2 = values2[2] / 100;
  const a = s * Math.min(l2, 1 - l2);
  const f2 = (n2, k2 = (n2 + h2 / 30) % 12) => l2 - a * Math.max(Math.min(k2 - 3, 9 - k2, 1), -1);
  let type = "rgb";
  const rgb = [Math.round(f2(0) * 255), Math.round(f2(8) * 255), Math.round(f2(4) * 255)];
  if (color2.type === "hsla") {
    type += "a";
    rgb.push(values2[3]);
  }
  return recomposeColor({
    type,
    values: rgb
  });
}
function getLuminance(color2) {
  color2 = decomposeColor(color2);
  let rgb = color2.type === "hsl" || color2.type === "hsla" ? decomposeColor(hslToRgb(color2)).values : color2.values;
  rgb = rgb.map((val) => {
    if (color2.type !== "color") {
      val /= 255;
    }
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4;
  });
  return Number((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]).toFixed(3));
}
function getContrastRatio(foreground, background) {
  const lumA = getLuminance(foreground);
  const lumB = getLuminance(background);
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}
function alpha(color2, value) {
  color2 = decomposeColor(color2);
  value = clampWrapper(value);
  if (color2.type === "rgb" || color2.type === "hsl") {
    color2.type += "a";
  }
  if (color2.type === "color") {
    color2.values[3] = `/${value}`;
  } else {
    color2.values[3] = value;
  }
  return recomposeColor(color2);
}
function private_safeAlpha(color2, value, warning) {
  try {
    return alpha(color2, value);
  } catch (error) {
    return color2;
  }
}
function darken(color2, coefficient) {
  color2 = decomposeColor(color2);
  coefficient = clampWrapper(coefficient);
  if (color2.type.indexOf("hsl") !== -1) {
    color2.values[2] *= 1 - coefficient;
  } else if (color2.type.indexOf("rgb") !== -1 || color2.type.indexOf("color") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      color2.values[i] *= 1 - coefficient;
    }
  }
  return recomposeColor(color2);
}
function private_safeDarken(color2, coefficient, warning) {
  try {
    return darken(color2, coefficient);
  } catch (error) {
    return color2;
  }
}
function lighten(color2, coefficient) {
  color2 = decomposeColor(color2);
  coefficient = clampWrapper(coefficient);
  if (color2.type.indexOf("hsl") !== -1) {
    color2.values[2] += (100 - color2.values[2]) * coefficient;
  } else if (color2.type.indexOf("rgb") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      color2.values[i] += (255 - color2.values[i]) * coefficient;
    }
  } else if (color2.type.indexOf("color") !== -1) {
    for (let i = 0; i < 3; i += 1) {
      color2.values[i] += (1 - color2.values[i]) * coefficient;
    }
  }
  return recomposeColor(color2);
}
function private_safeLighten(color2, coefficient, warning) {
  try {
    return lighten(color2, coefficient);
  } catch (error) {
    return color2;
  }
}
function emphasize(color2, coefficient = 0.15) {
  return getLuminance(color2) > 0.5 ? darken(color2, coefficient) : lighten(color2, coefficient);
}
function private_safeEmphasize(color2, coefficient, warning) {
  try {
    return emphasize(color2, coefficient);
  } catch (error) {
    return color2;
  }
}
function blend(background, overlay, opacity, gamma = 1) {
  const blendChannel = (b2, o) => Math.round((b2 ** (1 / gamma) * (1 - opacity) + o ** (1 / gamma) * opacity) ** gamma);
  const backgroundColor2 = decomposeColor(background);
  const overlayColor = decomposeColor(overlay);
  const rgb = [blendChannel(backgroundColor2.values[0], overlayColor.values[0]), blendChannel(backgroundColor2.values[1], overlayColor.values[1]), blendChannel(backgroundColor2.values[2], overlayColor.values[2])];
  return recomposeColor({
    type: "rgb",
    values: rgb
  });
}
const common = {
  black: "#000",
  white: "#fff"
};
const grey = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#eeeeee",
  300: "#e0e0e0",
  400: "#bdbdbd",
  500: "#9e9e9e",
  600: "#757575",
  700: "#616161",
  800: "#424242",
  900: "#212121",
  A100: "#f5f5f5",
  A200: "#eeeeee",
  A400: "#bdbdbd",
  A700: "#616161"
};
const purple = {
  50: "#f3e5f5",
  200: "#ce93d8",
  300: "#ba68c8",
  400: "#ab47bc",
  500: "#9c27b0",
  700: "#7b1fa2"
};
const red = {
  300: "#e57373",
  400: "#ef5350",
  500: "#f44336",
  700: "#d32f2f",
  800: "#c62828"
};
const orange = {
  300: "#ffb74d",
  400: "#ffa726",
  500: "#ff9800",
  700: "#f57c00",
  900: "#e65100"
};
const blue = {
  50: "#e3f2fd",
  200: "#90caf9",
  400: "#42a5f5",
  700: "#1976d2",
  800: "#1565c0"
};
const lightBlue = {
  300: "#4fc3f7",
  400: "#29b6f6",
  500: "#03a9f4",
  700: "#0288d1",
  900: "#01579b"
};
const green = {
  300: "#81c784",
  400: "#66bb6a",
  500: "#4caf50",
  700: "#388e3c",
  800: "#2e7d32",
  900: "#1b5e20"
};
const _excluded$1X = ["mode", "contrastThreshold", "tonalOffset"];
const light = {
  // The colors used to style the text.
  text: {
    // The most important text.
    primary: "rgba(0, 0, 0, 0.87)",
    // Secondary text.
    secondary: "rgba(0, 0, 0, 0.6)",
    // Disabled text have even lower visual prominence.
    disabled: "rgba(0, 0, 0, 0.38)"
  },
  // The color used to divide different elements.
  divider: "rgba(0, 0, 0, 0.12)",
  // The background colors used to style the surfaces.
  // Consistency between these values is important.
  background: {
    paper: common.white,
    default: common.white
  },
  // The colors used to style the action elements.
  action: {
    // The color of an active action like an icon button.
    active: "rgba(0, 0, 0, 0.54)",
    // The color of an hovered action.
    hover: "rgba(0, 0, 0, 0.04)",
    hoverOpacity: 0.04,
    // The color of a selected action.
    selected: "rgba(0, 0, 0, 0.08)",
    selectedOpacity: 0.08,
    // The color of a disabled action.
    disabled: "rgba(0, 0, 0, 0.26)",
    // The background color of a disabled action.
    disabledBackground: "rgba(0, 0, 0, 0.12)",
    disabledOpacity: 0.38,
    focus: "rgba(0, 0, 0, 0.12)",
    focusOpacity: 0.12,
    activatedOpacity: 0.12
  }
};
const dark = {
  text: {
    primary: common.white,
    secondary: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.5)",
    icon: "rgba(255, 255, 255, 0.5)"
  },
  divider: "rgba(255, 255, 255, 0.12)",
  background: {
    paper: "#121212",
    default: "#121212"
  },
  action: {
    active: common.white,
    hover: "rgba(255, 255, 255, 0.08)",
    hoverOpacity: 0.08,
    selected: "rgba(255, 255, 255, 0.16)",
    selectedOpacity: 0.16,
    disabled: "rgba(255, 255, 255, 0.3)",
    disabledBackground: "rgba(255, 255, 255, 0.12)",
    disabledOpacity: 0.38,
    focus: "rgba(255, 255, 255, 0.12)",
    focusOpacity: 0.12,
    activatedOpacity: 0.24
  }
};
function addLightOrDark(intent, direction, shade, tonalOffset) {
  const tonalOffsetLight = tonalOffset.light || tonalOffset;
  const tonalOffsetDark = tonalOffset.dark || tonalOffset * 1.5;
  if (!intent[direction]) {
    if (intent.hasOwnProperty(shade)) {
      intent[direction] = intent[shade];
    } else if (direction === "light") {
      intent.light = lighten_1(intent.main, tonalOffsetLight);
    } else if (direction === "dark") {
      intent.dark = darken_1(intent.main, tonalOffsetDark);
    }
  }
}
function getDefaultPrimary(mode = "light") {
  if (mode === "dark") {
    return {
      main: blue[200],
      light: blue[50],
      dark: blue[400]
    };
  }
  return {
    main: blue[700],
    light: blue[400],
    dark: blue[800]
  };
}
function getDefaultSecondary(mode = "light") {
  if (mode === "dark") {
    return {
      main: purple[200],
      light: purple[50],
      dark: purple[400]
    };
  }
  return {
    main: purple[500],
    light: purple[300],
    dark: purple[700]
  };
}
function getDefaultError(mode = "light") {
  if (mode === "dark") {
    return {
      main: red[500],
      light: red[300],
      dark: red[700]
    };
  }
  return {
    main: red[700],
    light: red[400],
    dark: red[800]
  };
}
function getDefaultInfo(mode = "light") {
  if (mode === "dark") {
    return {
      main: lightBlue[400],
      light: lightBlue[300],
      dark: lightBlue[700]
    };
  }
  return {
    main: lightBlue[700],
    light: lightBlue[500],
    dark: lightBlue[900]
  };
}
function getDefaultSuccess(mode = "light") {
  if (mode === "dark") {
    return {
      main: green[400],
      light: green[300],
      dark: green[700]
    };
  }
  return {
    main: green[800],
    light: green[500],
    dark: green[900]
  };
}
function getDefaultWarning(mode = "light") {
  if (mode === "dark") {
    return {
      main: orange[400],
      light: orange[300],
      dark: orange[700]
    };
  }
  return {
    main: "#ed6c02",
    // closest to orange[800] that pass 3:1.
    light: orange[500],
    dark: orange[900]
  };
}
function createPalette(palette) {
  const {
    mode = "light",
    contrastThreshold = 3,
    tonalOffset = 0.2
  } = palette, other = _objectWithoutPropertiesLoose(palette, _excluded$1X);
  const primary = palette.primary || getDefaultPrimary(mode);
  const secondary = palette.secondary || getDefaultSecondary(mode);
  const error = palette.error || getDefaultError(mode);
  const info = palette.info || getDefaultInfo(mode);
  const success = palette.success || getDefaultSuccess(mode);
  const warning = palette.warning || getDefaultWarning(mode);
  function getContrastText(background) {
    const contrastText = getContrastRatio_1(background, dark.text.primary) >= contrastThreshold ? dark.text.primary : light.text.primary;
    return contrastText;
  }
  const augmentColor = ({
    color: color2,
    name,
    mainShade = 500,
    lightShade = 300,
    darkShade = 700
  }) => {
    color2 = _extends({}, color2);
    if (!color2.main && color2[mainShade]) {
      color2.main = color2[mainShade];
    }
    if (!color2.hasOwnProperty("main")) {
      throw new Error(formatMuiErrorMessage$1(11, name ? ` (${name})` : "", mainShade));
    }
    if (typeof color2.main !== "string") {
      throw new Error(formatMuiErrorMessage$1(12, name ? ` (${name})` : "", JSON.stringify(color2.main)));
    }
    addLightOrDark(color2, "light", lightShade, tonalOffset);
    addLightOrDark(color2, "dark", darkShade, tonalOffset);
    if (!color2.contrastText) {
      color2.contrastText = getContrastText(color2.main);
    }
    return color2;
  };
  const modes = {
    dark,
    light
  };
  const paletteOutput = deepmerge$1(_extends({
    // A collection of common colors.
    common: _extends({}, common),
    // prevent mutable object.
    // The palette mode, can be light or dark.
    mode,
    // The colors used to represent primary interface elements for a user.
    primary: augmentColor({
      color: primary,
      name: "primary"
    }),
    // The colors used to represent secondary interface elements for a user.
    secondary: augmentColor({
      color: secondary,
      name: "secondary",
      mainShade: "A400",
      lightShade: "A200",
      darkShade: "A700"
    }),
    // The colors used to represent interface elements that the user should be made aware of.
    error: augmentColor({
      color: error,
      name: "error"
    }),
    // The colors used to represent potentially dangerous actions or important messages.
    warning: augmentColor({
      color: warning,
      name: "warning"
    }),
    // The colors used to present information to the user that is neutral and not necessarily important.
    info: augmentColor({
      color: info,
      name: "info"
    }),
    // The colors used to indicate the successful completion of an action that user triggered.
    success: augmentColor({
      color: success,
      name: "success"
    }),
    // The grey colors.
    grey,
    // Used by `getContrastText()` to maximize the contrast between
    // the background and the text.
    contrastThreshold,
    // Takes a background color and returns the text color that maximizes the contrast.
    getContrastText,
    // Generate a rich color object.
    augmentColor,
    // Used by the functions below to shift a color's luminance by approximately
    // two indexes within its tonal palette.
    // E.g., shift from Red 500 to Red 300 or Red 700.
    tonalOffset
  }, modes[mode]), other);
  return paletteOutput;
}
const _excluded$1W = ["fontFamily", "fontSize", "fontWeightLight", "fontWeightRegular", "fontWeightMedium", "fontWeightBold", "htmlFontSize", "allVariants", "pxToRem"];
function round$1(value) {
  return Math.round(value * 1e5) / 1e5;
}
const caseAllCaps = {
  textTransform: "uppercase"
};
const defaultFontFamily = '"Roboto", "Helvetica", "Arial", sans-serif';
function createTypography(palette, typography) {
  const _ref = typeof typography === "function" ? typography(palette) : typography, {
    fontFamily = defaultFontFamily,
    // The default font size of the Material Specification.
    fontSize = 14,
    // px
    fontWeightLight = 300,
    fontWeightRegular = 400,
    fontWeightMedium = 500,
    fontWeightBold = 700,
    // Tell MUI what's the font-size on the html element.
    // 16px is the default font-size used by browsers.
    htmlFontSize = 16,
    // Apply the CSS properties to all the variants.
    allVariants,
    pxToRem: pxToRem2
  } = _ref, other = _objectWithoutPropertiesLoose(_ref, _excluded$1W);
  const coef = fontSize / 14;
  const pxToRem = pxToRem2 || ((size) => `${size / htmlFontSize * coef}rem`);
  const buildVariant = (fontWeight, size, lineHeight, letterSpacing, casing) => _extends({
    fontFamily,
    fontWeight,
    fontSize: pxToRem(size),
    // Unitless following https://meyerweb.com/eric/thoughts/2006/02/08/unitless-line-heights/
    lineHeight
  }, fontFamily === defaultFontFamily ? {
    letterSpacing: `${round$1(letterSpacing / size)}em`
  } : {}, casing, allVariants);
  const variants = {
    h1: buildVariant(fontWeightLight, 96, 1.167, -1.5),
    h2: buildVariant(fontWeightLight, 60, 1.2, -0.5),
    h3: buildVariant(fontWeightRegular, 48, 1.167, 0),
    h4: buildVariant(fontWeightRegular, 34, 1.235, 0.25),
    h5: buildVariant(fontWeightRegular, 24, 1.334, 0),
    h6: buildVariant(fontWeightMedium, 20, 1.6, 0.15),
    subtitle1: buildVariant(fontWeightRegular, 16, 1.75, 0.15),
    subtitle2: buildVariant(fontWeightMedium, 14, 1.57, 0.1),
    body1: buildVariant(fontWeightRegular, 16, 1.5, 0.15),
    body2: buildVariant(fontWeightRegular, 14, 1.43, 0.15),
    button: buildVariant(fontWeightMedium, 14, 1.75, 0.4, caseAllCaps),
    caption: buildVariant(fontWeightRegular, 12, 1.66, 0.4),
    overline: buildVariant(fontWeightRegular, 12, 2.66, 1, caseAllCaps),
    // TODO v6: Remove handling of 'inherit' variant from the theme as it is already handled in Material UI's Typography component. Also, remember to remove the associated types.
    inherit: {
      fontFamily: "inherit",
      fontWeight: "inherit",
      fontSize: "inherit",
      lineHeight: "inherit",
      letterSpacing: "inherit"
    }
  };
  return deepmerge$1(_extends({
    htmlFontSize,
    pxToRem,
    fontFamily,
    fontSize,
    fontWeightLight,
    fontWeightRegular,
    fontWeightMedium,
    fontWeightBold
  }, variants), other, {
    clone: false
    // No need to clone deep
  });
}
const shadowKeyUmbraOpacity = 0.2;
const shadowKeyPenumbraOpacity = 0.14;
const shadowAmbientShadowOpacity = 0.12;
function createShadow(...px) {
  return [`${px[0]}px ${px[1]}px ${px[2]}px ${px[3]}px rgba(0,0,0,${shadowKeyUmbraOpacity})`, `${px[4]}px ${px[5]}px ${px[6]}px ${px[7]}px rgba(0,0,0,${shadowKeyPenumbraOpacity})`, `${px[8]}px ${px[9]}px ${px[10]}px ${px[11]}px rgba(0,0,0,${shadowAmbientShadowOpacity})`].join(",");
}
const shadows = ["none", createShadow(0, 2, 1, -1, 0, 1, 1, 0, 0, 1, 3, 0), createShadow(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0), createShadow(0, 3, 3, -2, 0, 3, 4, 0, 0, 1, 8, 0), createShadow(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0), createShadow(0, 3, 5, -1, 0, 5, 8, 0, 0, 1, 14, 0), createShadow(0, 3, 5, -1, 0, 6, 10, 0, 0, 1, 18, 0), createShadow(0, 4, 5, -2, 0, 7, 10, 1, 0, 2, 16, 1), createShadow(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2), createShadow(0, 5, 6, -3, 0, 9, 12, 1, 0, 3, 16, 2), createShadow(0, 6, 6, -3, 0, 10, 14, 1, 0, 4, 18, 3), createShadow(0, 6, 7, -4, 0, 11, 15, 1, 0, 4, 20, 3), createShadow(0, 7, 8, -4, 0, 12, 17, 2, 0, 5, 22, 4), createShadow(0, 7, 8, -4, 0, 13, 19, 2, 0, 5, 24, 4), createShadow(0, 7, 9, -4, 0, 14, 21, 2, 0, 5, 26, 4), createShadow(0, 8, 9, -5, 0, 15, 22, 2, 0, 6, 28, 5), createShadow(0, 8, 10, -5, 0, 16, 24, 2, 0, 6, 30, 5), createShadow(0, 8, 11, -5, 0, 17, 26, 2, 0, 6, 32, 5), createShadow(0, 9, 11, -5, 0, 18, 28, 2, 0, 7, 34, 6), createShadow(0, 9, 12, -6, 0, 19, 29, 2, 0, 7, 36, 6), createShadow(0, 10, 13, -6, 0, 20, 31, 3, 0, 8, 38, 7), createShadow(0, 10, 13, -6, 0, 21, 33, 3, 0, 8, 40, 7), createShadow(0, 10, 14, -6, 0, 22, 35, 3, 0, 8, 42, 7), createShadow(0, 11, 14, -7, 0, 23, 36, 3, 0, 9, 44, 8), createShadow(0, 11, 15, -7, 0, 24, 38, 3, 0, 9, 46, 8)];
const _excluded$1V = ["duration", "easing", "delay"];
const easing = {
  // This is the most common easing curve.
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  // Objects enter the screen at full velocity from off-screen and
  // slowly decelerate to a resting point.
  easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
  // Objects leave the screen at full velocity. They do not decelerate when off-screen.
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  // The sharp curve is used by objects that may return to the screen at any time.
  sharp: "cubic-bezier(0.4, 0, 0.6, 1)"
};
const duration = {
  shortest: 150,
  shorter: 200,
  short: 250,
  // most basic recommended timing
  standard: 300,
  // this is to be used in complex animations
  complex: 375,
  // recommended when something is entering screen
  enteringScreen: 225,
  // recommended when something is leaving screen
  leavingScreen: 195
};
function formatMs(milliseconds) {
  return `${Math.round(milliseconds)}ms`;
}
function getAutoHeightDuration(height2) {
  if (!height2) {
    return 0;
  }
  const constant = height2 / 36;
  return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10);
}
function createTransitions(inputTransitions) {
  const mergedEasing = _extends({}, easing, inputTransitions.easing);
  const mergedDuration = _extends({}, duration, inputTransitions.duration);
  const create = (props = ["all"], options = {}) => {
    const {
      duration: durationOption = mergedDuration.standard,
      easing: easingOption = mergedEasing.easeInOut,
      delay = 0
    } = options;
    _objectWithoutPropertiesLoose(options, _excluded$1V);
    return (Array.isArray(props) ? props : [props]).map((animatedProp) => `${animatedProp} ${typeof durationOption === "string" ? durationOption : formatMs(durationOption)} ${easingOption} ${typeof delay === "string" ? delay : formatMs(delay)}`).join(",");
  };
  return _extends({
    getAutoHeightDuration,
    create
  }, inputTransitions, {
    easing: mergedEasing,
    duration: mergedDuration
  });
}
const zIndex = {
  mobileStepper: 1e3,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500
};
const _excluded$1U = ["breakpoints", "mixins", "spacing", "palette", "transitions", "typography", "shape"];
function createTheme(options = {}, ...args) {
  const {
    mixins: mixinsInput = {},
    palette: paletteInput = {},
    transitions: transitionsInput = {},
    typography: typographyInput = {}
  } = options, other = _objectWithoutPropertiesLoose(options, _excluded$1U);
  if (options.vars) {
    throw new Error(formatMuiErrorMessage$1(18));
  }
  const palette = createPalette(paletteInput);
  const systemTheme = createTheme$2(options);
  let muiTheme = deepmerge$1(systemTheme, {
    mixins: createMixins(systemTheme.breakpoints, mixinsInput),
    palette,
    // Don't use [...shadows] until you've verified its transpiled code is not invoking the iterator protocol.
    shadows: shadows.slice(),
    typography: createTypography(palette, typographyInput),
    transitions: createTransitions(transitionsInput),
    zIndex: _extends({}, zIndex)
  });
  muiTheme = deepmerge$1(muiTheme, other);
  muiTheme = args.reduce((acc, argument) => deepmerge$1(acc, argument), muiTheme);
  muiTheme.unstable_sxConfig = _extends({}, defaultSxConfig, other == null ? void 0 : other.unstable_sxConfig);
  muiTheme.unstable_sx = function sx(props) {
    return styleFunctionSx$1({
      sx: props,
      theme: this
    });
  };
  return muiTheme;
}
const defaultTheme$1 = createTheme();
function useTheme$1() {
  const theme = useTheme$3(defaultTheme$1);
  return theme[THEME_ID] || theme;
}
function useThemeProps$a({
  props,
  name
}) {
  return useThemeProps$b({
    props,
    name,
    defaultTheme: defaultTheme$1,
    themeId: THEME_ID
  });
}
var createStyled$1 = {};
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(styledEngine);
const require$$4 = /* @__PURE__ */ getAugmentedNamespace(deepmerge);
const require$$5 = /* @__PURE__ */ getAugmentedNamespace(capitalize);
const require$$6 = /* @__PURE__ */ getAugmentedNamespace(getDisplayName);
const require$$7 = /* @__PURE__ */ getAugmentedNamespace(createTheme$1);
const require$$8 = /* @__PURE__ */ getAugmentedNamespace(styleFunctionSx);
var _interopRequireDefault$X = interopRequireDefaultExports;
Object.defineProperty(createStyled$1, "__esModule", {
  value: true
});
var _default = createStyled$1.default = createStyled2;
createStyled$1.shouldForwardProp = shouldForwardProp;
createStyled$1.systemDefaultTheme = void 0;
var _extends2 = _interopRequireDefault$X(require_extends());
var _objectWithoutPropertiesLoose2 = _interopRequireDefault$X(requireObjectWithoutPropertiesLoose());
var _styledEngine$1 = _interopRequireWildcard$1(require$$1);
var _deepmerge = require$$4;
_interopRequireDefault$X(require$$5);
_interopRequireDefault$X(require$$6);
var _createTheme = _interopRequireDefault$X(require$$7);
var _styleFunctionSx = _interopRequireDefault$X(require$$8);
const _excluded$1T = ["ownerState"], _excluded2$c = ["variants"], _excluded3$2 = ["name", "slot", "skipVariantsResolver", "skipSx", "overridesResolver"];
function _getRequireWildcardCache$1(e2) {
  if ("function" != typeof WeakMap) return null;
  var r = /* @__PURE__ */ new WeakMap(), t2 = /* @__PURE__ */ new WeakMap();
  return (_getRequireWildcardCache$1 = function(e22) {
    return e22 ? t2 : r;
  })(e2);
}
function _interopRequireWildcard$1(e2, r) {
  if (e2 && e2.__esModule) return e2;
  if (null === e2 || "object" != typeof e2 && "function" != typeof e2) return { default: e2 };
  var t2 = _getRequireWildcardCache$1(r);
  if (t2 && t2.has(e2)) return t2.get(e2);
  var n2 = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var u2 in e2) if ("default" !== u2 && Object.prototype.hasOwnProperty.call(e2, u2)) {
    var i = a ? Object.getOwnPropertyDescriptor(e2, u2) : null;
    i && (i.get || i.set) ? Object.defineProperty(n2, u2, i) : n2[u2] = e2[u2];
  }
  return n2.default = e2, t2 && t2.set(e2, n2), n2;
}
function isEmpty$2(obj) {
  return Object.keys(obj).length === 0;
}
function isStringTag(tag) {
  return typeof tag === "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  tag.charCodeAt(0) > 96;
}
function shouldForwardProp(prop) {
  return prop !== "ownerState" && prop !== "theme" && prop !== "sx" && prop !== "as";
}
function shallowLayer(serialized, layerName) {
  if (layerName && serialized && typeof serialized === "object" && serialized.styles && !serialized.styles.startsWith("@layer")) {
    serialized.styles = `@layer ${layerName}{${String(serialized.styles)}}`;
  }
  return serialized;
}
const systemDefaultTheme = createStyled$1.systemDefaultTheme = (0, _createTheme.default)();
const lowercaseFirstLetter = (string) => {
  if (!string) {
    return string;
  }
  return string.charAt(0).toLowerCase() + string.slice(1);
};
function resolveTheme({
  defaultTheme: defaultTheme2,
  theme,
  themeId
}) {
  return isEmpty$2(theme) ? defaultTheme2 : theme[themeId] || theme;
}
function defaultOverridesResolver(slot) {
  if (!slot) {
    return null;
  }
  return (props, styles2) => styles2[slot];
}
function processStyleArg(callableStyle, _ref, layerName) {
  let {
    ownerState
  } = _ref, props = (0, _objectWithoutPropertiesLoose2.default)(_ref, _excluded$1T);
  const resolvedStylesArg = typeof callableStyle === "function" ? callableStyle((0, _extends2.default)({
    ownerState
  }, props)) : callableStyle;
  if (Array.isArray(resolvedStylesArg)) {
    return resolvedStylesArg.flatMap((resolvedStyle) => processStyleArg(resolvedStyle, (0, _extends2.default)({
      ownerState
    }, props), layerName));
  }
  if (!!resolvedStylesArg && typeof resolvedStylesArg === "object" && Array.isArray(resolvedStylesArg.variants)) {
    const {
      variants = []
    } = resolvedStylesArg, otherStyles = (0, _objectWithoutPropertiesLoose2.default)(resolvedStylesArg, _excluded2$c);
    let result = otherStyles;
    variants.forEach((variant) => {
      let isMatch = true;
      if (typeof variant.props === "function") {
        isMatch = variant.props((0, _extends2.default)({
          ownerState
        }, props, ownerState));
      } else {
        Object.keys(variant.props).forEach((key) => {
          if ((ownerState == null ? void 0 : ownerState[key]) !== variant.props[key] && props[key] !== variant.props[key]) {
            isMatch = false;
          }
        });
      }
      if (isMatch) {
        if (!Array.isArray(result)) {
          result = [result];
        }
        const variantStyle = typeof variant.style === "function" ? variant.style((0, _extends2.default)({
          ownerState
        }, props, ownerState)) : variant.style;
        result.push(layerName ? shallowLayer((0, _styledEngine$1.internal_serializeStyles)(variantStyle), layerName) : variantStyle);
      }
    });
    return result;
  }
  return layerName ? shallowLayer((0, _styledEngine$1.internal_serializeStyles)(resolvedStylesArg), layerName) : resolvedStylesArg;
}
function createStyled2(input = {}) {
  const {
    themeId,
    defaultTheme: defaultTheme2 = systemDefaultTheme,
    rootShouldForwardProp: rootShouldForwardProp2 = shouldForwardProp,
    slotShouldForwardProp: slotShouldForwardProp2 = shouldForwardProp
  } = input;
  const systemSx = (props) => {
    return (0, _styleFunctionSx.default)((0, _extends2.default)({}, props, {
      theme: resolveTheme((0, _extends2.default)({}, props, {
        defaultTheme: defaultTheme2,
        themeId
      }))
    }));
  };
  systemSx.__mui_systemSx = true;
  return (tag, inputOptions = {}) => {
    (0, _styledEngine$1.internal_processStyles)(tag, (styles2) => styles2.filter((style2) => !(style2 != null && style2.__mui_systemSx)));
    const {
      name: componentName,
      slot: componentSlot,
      skipVariantsResolver: inputSkipVariantsResolver,
      skipSx: inputSkipSx,
      // TODO v6: remove `lowercaseFirstLetter()` in the next major release
      // For more details: https://github.com/mui/material-ui/pull/37908
      overridesResolver: overridesResolver2 = defaultOverridesResolver(lowercaseFirstLetter(componentSlot))
    } = inputOptions, options = (0, _objectWithoutPropertiesLoose2.default)(inputOptions, _excluded3$2);
    const layerName = componentName && componentName.startsWith("Mui") || !!componentSlot ? "components" : "custom";
    const skipVariantsResolver = inputSkipVariantsResolver !== void 0 ? inputSkipVariantsResolver : (
      // TODO v6: remove `Root` in the next major release
      // For more details: https://github.com/mui/material-ui/pull/37908
      componentSlot && componentSlot !== "Root" && componentSlot !== "root" || false
    );
    const skipSx = inputSkipSx || false;
    let label;
    let shouldForwardPropOption = shouldForwardProp;
    if (componentSlot === "Root" || componentSlot === "root") {
      shouldForwardPropOption = rootShouldForwardProp2;
    } else if (componentSlot) {
      shouldForwardPropOption = slotShouldForwardProp2;
    } else if (isStringTag(tag)) {
      shouldForwardPropOption = void 0;
    }
    const defaultStyledResolver = (0, _styledEngine$1.default)(tag, (0, _extends2.default)({
      shouldForwardProp: shouldForwardPropOption,
      label
    }, options));
    const transformStyleArg = (stylesArg) => {
      if (typeof stylesArg === "function" && stylesArg.__emotion_real !== stylesArg || (0, _deepmerge.isPlainObject)(stylesArg)) {
        return (props) => {
          const theme = resolveTheme({
            theme: props.theme,
            defaultTheme: defaultTheme2,
            themeId
          });
          return processStyleArg(stylesArg, (0, _extends2.default)({}, props, {
            theme
          }), theme.modularCssLayers ? layerName : void 0);
        };
      }
      return stylesArg;
    };
    const muiStyledResolver = (styleArg, ...expressions) => {
      let transformedStyleArg = transformStyleArg(styleArg);
      const expressionsWithDefaultTheme = expressions ? expressions.map(transformStyleArg) : [];
      if (componentName && overridesResolver2) {
        expressionsWithDefaultTheme.push((props) => {
          const theme = resolveTheme((0, _extends2.default)({}, props, {
            defaultTheme: defaultTheme2,
            themeId
          }));
          if (!theme.components || !theme.components[componentName] || !theme.components[componentName].styleOverrides) {
            return null;
          }
          const styleOverrides = theme.components[componentName].styleOverrides;
          const resolvedStyleOverrides = {};
          Object.entries(styleOverrides).forEach(([slotKey, slotStyle]) => {
            resolvedStyleOverrides[slotKey] = processStyleArg(slotStyle, (0, _extends2.default)({}, props, {
              theme
            }), theme.modularCssLayers ? "theme" : void 0);
          });
          return overridesResolver2(props, resolvedStyleOverrides);
        });
      }
      if (componentName && !skipVariantsResolver) {
        expressionsWithDefaultTheme.push((props) => {
          var _theme$components;
          const theme = resolveTheme((0, _extends2.default)({}, props, {
            defaultTheme: defaultTheme2,
            themeId
          }));
          const themeVariants = theme == null || (_theme$components = theme.components) == null || (_theme$components = _theme$components[componentName]) == null ? void 0 : _theme$components.variants;
          return processStyleArg({
            variants: themeVariants
          }, (0, _extends2.default)({}, props, {
            theme
          }), theme.modularCssLayers ? "theme" : void 0);
        });
      }
      if (!skipSx) {
        expressionsWithDefaultTheme.push(systemSx);
      }
      const numOfCustomFnsApplied = expressionsWithDefaultTheme.length - expressions.length;
      if (Array.isArray(styleArg) && numOfCustomFnsApplied > 0) {
        const placeholders = new Array(numOfCustomFnsApplied).fill("");
        transformedStyleArg = [...styleArg, ...placeholders];
        transformedStyleArg.raw = [...styleArg.raw, ...placeholders];
      }
      const Component = defaultStyledResolver(transformedStyleArg, ...expressionsWithDefaultTheme);
      if (tag.muiName) {
        Component.muiName = tag.muiName;
      }
      return Component;
    };
    if (defaultStyledResolver.withConfig) {
      muiStyledResolver.withConfig = defaultStyledResolver.withConfig;
    }
    return muiStyledResolver;
  };
}
function slotShouldForwardProp(prop) {
  return prop !== "ownerState" && prop !== "theme" && prop !== "sx" && prop !== "as";
}
const rootShouldForwardProp = (prop) => slotShouldForwardProp(prop) && prop !== "classes";
const styled = _default({
  themeId: THEME_ID,
  defaultTheme: defaultTheme$1,
  rootShouldForwardProp
});
const _excluded$1S = ["theme"];
function ThemeProvider(_ref) {
  let {
    theme: themeInput
  } = _ref, props = _objectWithoutPropertiesLoose(_ref, _excluded$1S);
  const scopedTheme = themeInput[THEME_ID];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeProvider$1, _extends({}, props, {
    themeId: scopedTheme ? THEME_ID : void 0,
    theme: scopedTheme || themeInput
  }));
}
const getOverlayAlpha = (elevation) => {
  let alphaValue;
  if (elevation < 1) {
    alphaValue = 5.11916 * elevation ** 2;
  } else {
    alphaValue = 4.5 * Math.log(elevation + 1) + 2;
  }
  return (alphaValue / 100).toFixed(2);
};
const _excluded$1R = ["localeText"];
const MuiPickersAdapterContext = /* @__PURE__ */ reactExports.createContext(null);
const LocalizationProvider = function LocalizationProvider2(inProps) {
  var _React$useContext;
  const {
    localeText: inLocaleText
  } = inProps, otherInProps = _objectWithoutPropertiesLoose(inProps, _excluded$1R);
  const {
    utils: parentUtils,
    localeText: parentLocaleText
  } = (_React$useContext = reactExports.useContext(MuiPickersAdapterContext)) != null ? _React$useContext : {
    utils: void 0,
    localeText: void 0
  };
  const props = useThemeProps$a({
    // We don't want to pass the `localeText` prop to the theme, that way it will always return the theme value,
    // We will then merge this theme value with our value manually
    props: otherInProps,
    name: "MuiLocalizationProvider"
  });
  const {
    children,
    dateAdapter: DateAdapter,
    dateFormats,
    dateLibInstance,
    adapterLocale,
    localeText: themeLocaleText
  } = props;
  const localeText = reactExports.useMemo(() => _extends({}, themeLocaleText, parentLocaleText, inLocaleText), [themeLocaleText, parentLocaleText, inLocaleText]);
  const utils2 = reactExports.useMemo(() => {
    if (!DateAdapter) {
      if (parentUtils) {
        return parentUtils;
      }
      return null;
    }
    const adapter = new DateAdapter({
      locale: adapterLocale,
      formats: dateFormats,
      instance: dateLibInstance
    });
    if (!adapter.isMUIAdapter) {
      throw new Error(["MUI: The date adapter should be imported from `@mui/x-date-pickers` or `@mui/x-date-pickers-pro`, not from `@date-io`", "For example, `import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'` instead of `import AdapterDayjs from '@date-io/dayjs'`", "More information on the installation documentation: https://mui.com/x/react-date-pickers/getting-started/#installation"].join(`
`));
    }
    return adapter;
  }, [DateAdapter, adapterLocale, dateFormats, dateLibInstance, parentUtils]);
  const defaultDates = reactExports.useMemo(() => {
    if (!utils2) {
      return null;
    }
    return {
      minDate: utils2.date("1900-01-01T00:00:00.000"),
      maxDate: utils2.date("2099-12-31T00:00:00.000")
    };
  }, [utils2]);
  const contextValue = reactExports.useMemo(() => {
    return {
      utils: utils2,
      defaultDates,
      localeText
    };
  }, [defaultDates, utils2, localeText]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MuiPickersAdapterContext.Provider, {
    value: contextValue,
    children
  });
};
function getTypographyUtilityClass(slot) {
  return generateUtilityClass$2("MuiTypography", slot);
}
generateUtilityClasses("MuiTypography", ["root", "h1", "h2", "h3", "h4", "h5", "h6", "subtitle1", "subtitle2", "body1", "body2", "inherit", "button", "caption", "overline", "alignLeft", "alignRight", "alignCenter", "alignJustify", "noWrap", "gutterBottom", "paragraph"]);
const _excluded$1Q = ["align", "className", "component", "gutterBottom", "noWrap", "paragraph", "variant", "variantMapping"];
const useUtilityClasses$1C = (ownerState) => {
  const {
    align,
    gutterBottom,
    noWrap,
    paragraph,
    variant,
    classes
  } = ownerState;
  const slots = {
    root: ["root", variant, ownerState.align !== "inherit" && `align${capitalize$1(align)}`, gutterBottom && "gutterBottom", noWrap && "noWrap", paragraph && "paragraph"]
  };
  return composeClasses(slots, getTypographyUtilityClass, classes);
};
const TypographyRoot = styled("span", {
  name: "MuiTypography",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.variant && styles2[ownerState.variant], ownerState.align !== "inherit" && styles2[`align${capitalize$1(ownerState.align)}`], ownerState.noWrap && styles2.noWrap, ownerState.gutterBottom && styles2.gutterBottom, ownerState.paragraph && styles2.paragraph];
  }
})(({
  theme,
  ownerState
}) => _extends({
  margin: 0
}, ownerState.variant === "inherit" && {
  // Some elements, like <button> on Chrome have default font that doesn't inherit, reset this.
  font: "inherit"
}, ownerState.variant !== "inherit" && theme.typography[ownerState.variant], ownerState.align !== "inherit" && {
  textAlign: ownerState.align
}, ownerState.noWrap && {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}, ownerState.gutterBottom && {
  marginBottom: "0.35em"
}, ownerState.paragraph && {
  marginBottom: 16
}));
const defaultVariantMapping = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "h6",
  subtitle2: "h6",
  body1: "p",
  body2: "p",
  inherit: "p"
};
const colorTransformations$1 = {
  primary: "primary.main",
  textPrimary: "text.primary",
  secondary: "secondary.main",
  textSecondary: "text.secondary",
  error: "error.main"
};
const transformDeprecatedColors$1 = (color2) => {
  return colorTransformations$1[color2] || color2;
};
const Typography = /* @__PURE__ */ reactExports.forwardRef(function Typography2(inProps, ref) {
  const themeProps = useThemeProps$a({
    props: inProps,
    name: "MuiTypography"
  });
  const color2 = transformDeprecatedColors$1(themeProps.color);
  const props = extendSxProp(_extends({}, themeProps, {
    color: color2
  }));
  const {
    align = "inherit",
    className,
    component,
    gutterBottom = false,
    noWrap = false,
    paragraph = false,
    variant = "body1",
    variantMapping = defaultVariantMapping
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1Q);
  const ownerState = _extends({}, props, {
    align,
    color: color2,
    className,
    component,
    gutterBottom,
    noWrap,
    paragraph,
    variant,
    variantMapping
  });
  const Component = component || (paragraph ? "p" : variantMapping[variant] || defaultVariantMapping[variant]) || "span";
  const classes = useUtilityClasses$1C(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TypographyRoot, _extends({
    as: Component,
    ref,
    ownerState,
    className: clsx(classes.root, className)
  }, other));
});
const defaultContextValue$1 = {
  disableDefaultClasses: false
};
const ClassNameConfiguratorContext$1 = /* @__PURE__ */ reactExports.createContext(defaultContextValue$1);
function useClassNamesOverride$1(generateUtilityClass2) {
  const {
    disableDefaultClasses
  } = reactExports.useContext(ClassNameConfiguratorContext$1);
  return (slot) => {
    if (disableDefaultClasses) {
      return "";
    }
    return generateUtilityClass2(slot);
  };
}
function Ripple(props) {
  const {
    className,
    classes,
    pulsate = false,
    rippleX,
    rippleY,
    rippleSize,
    in: inProp,
    onExited,
    timeout
  } = props;
  const [leaving, setLeaving] = reactExports.useState(false);
  const rippleClassName = clsx(className, classes.ripple, classes.rippleVisible, pulsate && classes.ripplePulsate);
  const rippleStyles = {
    width: rippleSize,
    height: rippleSize,
    top: -(rippleSize / 2) + rippleY,
    left: -(rippleSize / 2) + rippleX
  };
  const childClassName = clsx(classes.child, leaving && classes.childLeaving, pulsate && classes.childPulsate);
  if (!inProp && !leaving) {
    setLeaving(true);
  }
  reactExports.useEffect(() => {
    if (!inProp && onExited != null) {
      const timeoutId = setTimeout(onExited, timeout);
      return () => {
        clearTimeout(timeoutId);
      };
    }
    return void 0;
  }, [onExited, inProp, timeout]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
    className: rippleClassName,
    style: rippleStyles,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
      className: childClassName
    })
  });
}
const touchRippleClasses = generateUtilityClasses("MuiTouchRipple", ["root", "ripple", "rippleVisible", "ripplePulsate", "child", "childLeaving", "childPulsate"]);
const _excluded$1P = ["center", "classes", "className"];
let _$2 = (t2) => t2, _t$2, _t2$2, _t3$2, _t4$2;
const DURATION = 550;
const DELAY_RIPPLE = 80;
const enterKeyframe = keyframes(_t$2 || (_t$2 = _$2`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`));
const exitKeyframe = keyframes(_t2$2 || (_t2$2 = _$2`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`));
const pulsateKeyframe = keyframes(_t3$2 || (_t3$2 = _$2`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`));
const TouchRippleRoot = styled("span", {
  name: "MuiTouchRipple",
  slot: "Root"
})({
  overflow: "hidden",
  pointerEvents: "none",
  position: "absolute",
  zIndex: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: "inherit"
});
const TouchRippleRipple = styled(Ripple, {
  name: "MuiTouchRipple",
  slot: "Ripple"
})(_t4$2 || (_t4$2 = _$2`
  opacity: 0;
  position: absolute;

  &.${0} {
    opacity: 0.3;
    transform: scale(1);
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  &.${0} {
    animation-duration: ${0}ms;
  }

  & .${0} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${0} {
    opacity: 0;
    animation-name: ${0};
    animation-duration: ${0}ms;
    animation-timing-function: ${0};
  }

  & .${0} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
    animation-name: ${0};
    animation-duration: 2500ms;
    animation-timing-function: ${0};
    animation-iteration-count: infinite;
    animation-delay: 200ms;
  }
`), touchRippleClasses.rippleVisible, enterKeyframe, DURATION, ({
  theme
}) => theme.transitions.easing.easeInOut, touchRippleClasses.ripplePulsate, ({
  theme
}) => theme.transitions.duration.shorter, touchRippleClasses.child, touchRippleClasses.childLeaving, exitKeyframe, DURATION, ({
  theme
}) => theme.transitions.easing.easeInOut, touchRippleClasses.childPulsate, pulsateKeyframe, ({
  theme
}) => theme.transitions.easing.easeInOut);
const TouchRipple = /* @__PURE__ */ reactExports.forwardRef(function TouchRipple2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTouchRipple"
  });
  const {
    center: centerProp = false,
    classes = {},
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1P);
  const [ripples, setRipples] = reactExports.useState([]);
  const nextKey = reactExports.useRef(0);
  const rippleCallback = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (rippleCallback.current) {
      rippleCallback.current();
      rippleCallback.current = null;
    }
  }, [ripples]);
  const ignoringMouseDown = reactExports.useRef(false);
  const startTimer = useTimeout();
  const startTimerCommit = reactExports.useRef(null);
  const container = reactExports.useRef(null);
  const startCommit = reactExports.useCallback((params) => {
    const {
      pulsate: pulsate2,
      rippleX,
      rippleY,
      rippleSize,
      cb
    } = params;
    setRipples((oldRipples) => [...oldRipples, /* @__PURE__ */ jsxRuntimeExports.jsx(TouchRippleRipple, {
      classes: {
        ripple: clsx(classes.ripple, touchRippleClasses.ripple),
        rippleVisible: clsx(classes.rippleVisible, touchRippleClasses.rippleVisible),
        ripplePulsate: clsx(classes.ripplePulsate, touchRippleClasses.ripplePulsate),
        child: clsx(classes.child, touchRippleClasses.child),
        childLeaving: clsx(classes.childLeaving, touchRippleClasses.childLeaving),
        childPulsate: clsx(classes.childPulsate, touchRippleClasses.childPulsate)
      },
      timeout: DURATION,
      pulsate: pulsate2,
      rippleX,
      rippleY,
      rippleSize
    }, nextKey.current)]);
    nextKey.current += 1;
    rippleCallback.current = cb;
  }, [classes]);
  const start = reactExports.useCallback((event = {}, options = {}, cb = () => {
  }) => {
    const {
      pulsate: pulsate2 = false,
      center = centerProp || options.pulsate,
      fakeElement = false
      // For test purposes
    } = options;
    if ((event == null ? void 0 : event.type) === "mousedown" && ignoringMouseDown.current) {
      ignoringMouseDown.current = false;
      return;
    }
    if ((event == null ? void 0 : event.type) === "touchstart") {
      ignoringMouseDown.current = true;
    }
    const element = fakeElement ? null : container.current;
    const rect = element ? element.getBoundingClientRect() : {
      width: 0,
      height: 0,
      left: 0,
      top: 0
    };
    let rippleX;
    let rippleY;
    let rippleSize;
    if (center || event === void 0 || event.clientX === 0 && event.clientY === 0 || !event.clientX && !event.touches) {
      rippleX = Math.round(rect.width / 2);
      rippleY = Math.round(rect.height / 2);
    } else {
      const {
        clientX,
        clientY
      } = event.touches && event.touches.length > 0 ? event.touches[0] : event;
      rippleX = Math.round(clientX - rect.left);
      rippleY = Math.round(clientY - rect.top);
    }
    if (center) {
      rippleSize = Math.sqrt((2 * rect.width ** 2 + rect.height ** 2) / 3);
      if (rippleSize % 2 === 0) {
        rippleSize += 1;
      }
    } else {
      const sizeX = Math.max(Math.abs((element ? element.clientWidth : 0) - rippleX), rippleX) * 2 + 2;
      const sizeY = Math.max(Math.abs((element ? element.clientHeight : 0) - rippleY), rippleY) * 2 + 2;
      rippleSize = Math.sqrt(sizeX ** 2 + sizeY ** 2);
    }
    if (event != null && event.touches) {
      if (startTimerCommit.current === null) {
        startTimerCommit.current = () => {
          startCommit({
            pulsate: pulsate2,
            rippleX,
            rippleY,
            rippleSize,
            cb
          });
        };
        startTimer.start(DELAY_RIPPLE, () => {
          if (startTimerCommit.current) {
            startTimerCommit.current();
            startTimerCommit.current = null;
          }
        });
      }
    } else {
      startCommit({
        pulsate: pulsate2,
        rippleX,
        rippleY,
        rippleSize,
        cb
      });
    }
  }, [centerProp, startCommit, startTimer]);
  const pulsate = reactExports.useCallback(() => {
    start({}, {
      pulsate: true
    });
  }, [start]);
  const stop = reactExports.useCallback((event, cb) => {
    startTimer.clear();
    if ((event == null ? void 0 : event.type) === "touchend" && startTimerCommit.current) {
      startTimerCommit.current();
      startTimerCommit.current = null;
      startTimer.start(0, () => {
        stop(event, cb);
      });
      return;
    }
    startTimerCommit.current = null;
    setRipples((oldRipples) => {
      if (oldRipples.length > 0) {
        return oldRipples.slice(1);
      }
      return oldRipples;
    });
    rippleCallback.current = cb;
  }, [startTimer]);
  reactExports.useImperativeHandle(ref, () => ({
    pulsate,
    start,
    stop
  }), [pulsate, start, stop]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TouchRippleRoot, _extends({
    className: clsx(touchRippleClasses.root, classes.root, className),
    ref: container
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionGroup, {
      component: null,
      exit: true,
      children: ripples
    })
  }));
});
function getButtonBaseUtilityClass(slot) {
  return generateUtilityClass$2("MuiButtonBase", slot);
}
const buttonBaseClasses = generateUtilityClasses("MuiButtonBase", ["root", "disabled", "focusVisible"]);
const _excluded$1O = ["action", "centerRipple", "children", "className", "component", "disabled", "disableRipple", "disableTouchRipple", "focusRipple", "focusVisibleClassName", "LinkComponent", "onBlur", "onClick", "onContextMenu", "onDragLeave", "onFocus", "onFocusVisible", "onKeyDown", "onKeyUp", "onMouseDown", "onMouseLeave", "onMouseUp", "onTouchEnd", "onTouchMove", "onTouchStart", "tabIndex", "TouchRippleProps", "touchRippleRef", "type"];
const useUtilityClasses$1B = (ownerState) => {
  const {
    disabled,
    focusVisible,
    focusVisibleClassName,
    classes
  } = ownerState;
  const slots = {
    root: ["root", disabled && "disabled", focusVisible && "focusVisible"]
  };
  const composedClasses = composeClasses(slots, getButtonBaseUtilityClass, classes);
  if (focusVisible && focusVisibleClassName) {
    composedClasses.root += ` ${focusVisibleClassName}`;
  }
  return composedClasses;
};
const ButtonBaseRoot = styled("button", {
  name: "MuiButtonBase",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxSizing: "border-box",
  WebkitTapHighlightColor: "transparent",
  backgroundColor: "transparent",
  // Reset default value
  // We disable the focus ring for mouse, touch and keyboard users.
  outline: 0,
  border: 0,
  margin: 0,
  // Remove the margin in Safari
  borderRadius: 0,
  padding: 0,
  // Remove the padding in Firefox
  cursor: "pointer",
  userSelect: "none",
  verticalAlign: "middle",
  MozAppearance: "none",
  // Reset
  WebkitAppearance: "none",
  // Reset
  textDecoration: "none",
  // So we take precedent over the style of a native <a /> element.
  color: "inherit",
  "&::-moz-focus-inner": {
    borderStyle: "none"
    // Remove Firefox dotted outline.
  },
  [`&.${buttonBaseClasses.disabled}`]: {
    pointerEvents: "none",
    // Disable link interactions
    cursor: "default"
  },
  "@media print": {
    colorAdjust: "exact"
  }
});
const ButtonBase = /* @__PURE__ */ reactExports.forwardRef(function ButtonBase2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiButtonBase"
  });
  const {
    action,
    centerRipple = false,
    children,
    className,
    component = "button",
    disabled = false,
    disableRipple = false,
    disableTouchRipple = false,
    focusRipple = false,
    LinkComponent = "a",
    onBlur,
    onClick,
    onContextMenu,
    onDragLeave,
    onFocus,
    onFocusVisible,
    onKeyDown,
    onKeyUp,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onTouchEnd,
    onTouchMove,
    onTouchStart,
    tabIndex = 0,
    TouchRippleProps,
    touchRippleRef,
    type
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1O);
  const buttonRef = reactExports.useRef(null);
  const rippleRef = reactExports.useRef(null);
  const handleRippleRef = useForkRef(rippleRef, touchRippleRef);
  const {
    isFocusVisibleRef,
    onFocus: handleFocusVisible,
    onBlur: handleBlurVisible,
    ref: focusVisibleRef
  } = useIsFocusVisible();
  const [focusVisible, setFocusVisible] = reactExports.useState(false);
  if (disabled && focusVisible) {
    setFocusVisible(false);
  }
  reactExports.useImperativeHandle(action, () => ({
    focusVisible: () => {
      setFocusVisible(true);
      buttonRef.current.focus();
    }
  }), []);
  const [mountedState, setMountedState] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setMountedState(true);
  }, []);
  const enableTouchRipple = mountedState && !disableRipple && !disabled;
  reactExports.useEffect(() => {
    if (focusVisible && focusRipple && !disableRipple && mountedState) {
      rippleRef.current.pulsate();
    }
  }, [disableRipple, focusRipple, focusVisible, mountedState]);
  function useRippleHandler(rippleAction, eventCallback, skipRippleAction = disableTouchRipple) {
    return useEventCallback((event) => {
      if (eventCallback) {
        eventCallback(event);
      }
      const ignore = skipRippleAction;
      if (!ignore && rippleRef.current) {
        rippleRef.current[rippleAction](event);
      }
      return true;
    });
  }
  const handleMouseDown = useRippleHandler("start", onMouseDown);
  const handleContextMenu = useRippleHandler("stop", onContextMenu);
  const handleDragLeave = useRippleHandler("stop", onDragLeave);
  const handleMouseUp = useRippleHandler("stop", onMouseUp);
  const handleMouseLeave = useRippleHandler("stop", (event) => {
    if (focusVisible) {
      event.preventDefault();
    }
    if (onMouseLeave) {
      onMouseLeave(event);
    }
  });
  const handleTouchStart = useRippleHandler("start", onTouchStart);
  const handleTouchEnd = useRippleHandler("stop", onTouchEnd);
  const handleTouchMove = useRippleHandler("stop", onTouchMove);
  const handleBlur = useRippleHandler("stop", (event) => {
    handleBlurVisible(event);
    if (isFocusVisibleRef.current === false) {
      setFocusVisible(false);
    }
    if (onBlur) {
      onBlur(event);
    }
  }, false);
  const handleFocus = useEventCallback((event) => {
    if (!buttonRef.current) {
      buttonRef.current = event.currentTarget;
    }
    handleFocusVisible(event);
    if (isFocusVisibleRef.current === true) {
      setFocusVisible(true);
      if (onFocusVisible) {
        onFocusVisible(event);
      }
    }
    if (onFocus) {
      onFocus(event);
    }
  });
  const isNonNativeButton = () => {
    const button = buttonRef.current;
    return component && component !== "button" && !(button.tagName === "A" && button.href);
  };
  const keydownRef = reactExports.useRef(false);
  const handleKeyDown2 = useEventCallback((event) => {
    if (focusRipple && !keydownRef.current && focusVisible && rippleRef.current && event.key === " ") {
      keydownRef.current = true;
      rippleRef.current.stop(event, () => {
        rippleRef.current.start(event);
      });
    }
    if (event.target === event.currentTarget && isNonNativeButton() && event.key === " ") {
      event.preventDefault();
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
    if (event.target === event.currentTarget && isNonNativeButton() && event.key === "Enter" && !disabled) {
      event.preventDefault();
      if (onClick) {
        onClick(event);
      }
    }
  });
  const handleKeyUp = useEventCallback((event) => {
    if (focusRipple && event.key === " " && rippleRef.current && focusVisible && !event.defaultPrevented) {
      keydownRef.current = false;
      rippleRef.current.stop(event, () => {
        rippleRef.current.pulsate(event);
      });
    }
    if (onKeyUp) {
      onKeyUp(event);
    }
    if (onClick && event.target === event.currentTarget && isNonNativeButton() && event.key === " " && !event.defaultPrevented) {
      onClick(event);
    }
  });
  let ComponentProp = component;
  if (ComponentProp === "button" && (other.href || other.to)) {
    ComponentProp = LinkComponent;
  }
  const buttonProps = {};
  if (ComponentProp === "button") {
    buttonProps.type = type === void 0 ? "button" : type;
    buttonProps.disabled = disabled;
  } else {
    if (!other.href && !other.to) {
      buttonProps.role = "button";
    }
    if (disabled) {
      buttonProps["aria-disabled"] = disabled;
    }
  }
  const handleRef = useForkRef(ref, focusVisibleRef, buttonRef);
  const ownerState = _extends({}, props, {
    centerRipple,
    component,
    disabled,
    disableRipple,
    disableTouchRipple,
    focusRipple,
    tabIndex,
    focusVisible
  });
  const classes = useUtilityClasses$1B(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ButtonBaseRoot, _extends({
    as: ComponentProp,
    className: clsx(classes.root, className),
    ownerState,
    onBlur: handleBlur,
    onClick,
    onContextMenu: handleContextMenu,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown2,
    onKeyUp: handleKeyUp,
    onMouseDown: handleMouseDown,
    onMouseLeave: handleMouseLeave,
    onMouseUp: handleMouseUp,
    onDragLeave: handleDragLeave,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchStart: handleTouchStart,
    ref: handleRef,
    tabIndex: disabled ? -1 : tabIndex,
    type
  }, buttonProps, other, {
    children: [children, enableTouchRipple ? (
      /* TouchRipple is only needed client-side, x2 boost on the server. */
      /* @__PURE__ */ jsxRuntimeExports.jsx(TouchRipple, _extends({
        ref: handleRippleRef,
        center: centerRipple
      }, TouchRippleProps))
    ) : null]
  }));
});
function getIconButtonUtilityClass(slot) {
  return generateUtilityClass$2("MuiIconButton", slot);
}
const iconButtonClasses = generateUtilityClasses("MuiIconButton", ["root", "disabled", "colorInherit", "colorPrimary", "colorSecondary", "colorError", "colorInfo", "colorSuccess", "colorWarning", "edgeStart", "edgeEnd", "sizeSmall", "sizeMedium", "sizeLarge"]);
const _excluded$1N = ["edge", "children", "className", "color", "disabled", "disableFocusRipple", "size"];
const useUtilityClasses$1A = (ownerState) => {
  const {
    classes,
    disabled,
    color: color2,
    edge,
    size
  } = ownerState;
  const slots = {
    root: ["root", disabled && "disabled", color2 !== "default" && `color${capitalize$1(color2)}`, edge && `edge${capitalize$1(edge)}`, `size${capitalize$1(size)}`]
  };
  return composeClasses(slots, getIconButtonUtilityClass, classes);
};
const IconButtonRoot = styled(ButtonBase, {
  name: "MuiIconButton",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.color !== "default" && styles2[`color${capitalize$1(ownerState.color)}`], ownerState.edge && styles2[`edge${capitalize$1(ownerState.edge)}`], styles2[`size${capitalize$1(ownerState.size)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  textAlign: "center",
  flex: "0 0 auto",
  fontSize: theme.typography.pxToRem(24),
  padding: 8,
  borderRadius: "50%",
  overflow: "visible",
  // Explicitly set the default value to solve a bug on IE11.
  color: (theme.vars || theme).palette.action.active,
  transition: theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest
  })
}, !ownerState.disableRipple && {
  "&:hover": {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.action.activeChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette.action.active, theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  }
}, ownerState.edge === "start" && {
  marginLeft: ownerState.size === "small" ? -3 : -12
}, ownerState.edge === "end" && {
  marginRight: ownerState.size === "small" ? -3 : -12
}), ({
  theme,
  ownerState
}) => {
  var _palette;
  const palette = (_palette = (theme.vars || theme).palette) == null ? void 0 : _palette[ownerState.color];
  return _extends({}, ownerState.color === "inherit" && {
    color: "inherit"
  }, ownerState.color !== "inherit" && ownerState.color !== "default" && _extends({
    color: palette == null ? void 0 : palette.main
  }, !ownerState.disableRipple && {
    "&:hover": _extends({}, palette && {
      backgroundColor: theme.vars ? `rgba(${palette.mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(palette.main, theme.palette.action.hoverOpacity)
    }, {
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    })
  }), ownerState.size === "small" && {
    padding: 5,
    fontSize: theme.typography.pxToRem(18)
  }, ownerState.size === "large" && {
    padding: 12,
    fontSize: theme.typography.pxToRem(28)
  }, {
    [`&.${iconButtonClasses.disabled}`]: {
      backgroundColor: "transparent",
      color: (theme.vars || theme).palette.action.disabled
    }
  });
});
const IconButton = /* @__PURE__ */ reactExports.forwardRef(function IconButton2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiIconButton"
  });
  const {
    edge = false,
    children,
    className,
    color: color2 = "default",
    disabled = false,
    disableFocusRipple = false,
    size = "medium"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1N);
  const ownerState = _extends({}, props, {
    edge,
    color: color2,
    disabled,
    disableFocusRipple,
    size
  });
  const classes = useUtilityClasses$1A(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(IconButtonRoot, _extends({
    className: clsx(classes.root, className),
    centerRipple: true,
    focusRipple: !disableFocusRipple,
    disabled,
    ref
  }, other, {
    ownerState,
    children
  }));
});
function getSvgIconUtilityClass(slot) {
  return generateUtilityClass$2("MuiSvgIcon", slot);
}
generateUtilityClasses("MuiSvgIcon", ["root", "colorPrimary", "colorSecondary", "colorAction", "colorError", "colorDisabled", "fontSizeInherit", "fontSizeSmall", "fontSizeMedium", "fontSizeLarge"]);
const _excluded$1M = ["children", "className", "color", "component", "fontSize", "htmlColor", "inheritViewBox", "titleAccess", "viewBox"];
const useUtilityClasses$1z = (ownerState) => {
  const {
    color: color2,
    fontSize,
    classes
  } = ownerState;
  const slots = {
    root: ["root", color2 !== "inherit" && `color${capitalize$1(color2)}`, `fontSize${capitalize$1(fontSize)}`]
  };
  return composeClasses(slots, getSvgIconUtilityClass, classes);
};
const SvgIconRoot = styled("svg", {
  name: "MuiSvgIcon",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.color !== "inherit" && styles2[`color${capitalize$1(ownerState.color)}`], styles2[`fontSize${capitalize$1(ownerState.fontSize)}`]];
  }
})(({
  theme,
  ownerState
}) => {
  var _theme$transitions, _theme$transitions$cr, _theme$transitions2, _theme$typography, _theme$typography$pxT, _theme$typography2, _theme$typography2$px, _theme$typography3, _theme$typography3$px, _palette$ownerState$c, _palette, _palette2, _palette3;
  return {
    userSelect: "none",
    width: "1em",
    height: "1em",
    display: "inline-block",
    // the <svg> will define the property that has `currentColor`
    // for example heroicons uses fill="none" and stroke="currentColor"
    fill: ownerState.hasSvgAsChild ? void 0 : "currentColor",
    flexShrink: 0,
    transition: (_theme$transitions = theme.transitions) == null || (_theme$transitions$cr = _theme$transitions.create) == null ? void 0 : _theme$transitions$cr.call(_theme$transitions, "fill", {
      duration: (_theme$transitions2 = theme.transitions) == null || (_theme$transitions2 = _theme$transitions2.duration) == null ? void 0 : _theme$transitions2.shorter
    }),
    fontSize: {
      inherit: "inherit",
      small: ((_theme$typography = theme.typography) == null || (_theme$typography$pxT = _theme$typography.pxToRem) == null ? void 0 : _theme$typography$pxT.call(_theme$typography, 20)) || "1.25rem",
      medium: ((_theme$typography2 = theme.typography) == null || (_theme$typography2$px = _theme$typography2.pxToRem) == null ? void 0 : _theme$typography2$px.call(_theme$typography2, 24)) || "1.5rem",
      large: ((_theme$typography3 = theme.typography) == null || (_theme$typography3$px = _theme$typography3.pxToRem) == null ? void 0 : _theme$typography3$px.call(_theme$typography3, 35)) || "2.1875rem"
    }[ownerState.fontSize],
    // TODO v5 deprecate, v6 remove for sx
    color: (_palette$ownerState$c = (_palette = (theme.vars || theme).palette) == null || (_palette = _palette[ownerState.color]) == null ? void 0 : _palette.main) != null ? _palette$ownerState$c : {
      action: (_palette2 = (theme.vars || theme).palette) == null || (_palette2 = _palette2.action) == null ? void 0 : _palette2.active,
      disabled: (_palette3 = (theme.vars || theme).palette) == null || (_palette3 = _palette3.action) == null ? void 0 : _palette3.disabled,
      inherit: void 0
    }[ownerState.color]
  };
});
const SvgIcon = /* @__PURE__ */ reactExports.forwardRef(function SvgIcon2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiSvgIcon"
  });
  const {
    children,
    className,
    color: color2 = "inherit",
    component = "svg",
    fontSize = "medium",
    htmlColor,
    inheritViewBox = false,
    titleAccess,
    viewBox = "0 0 24 24"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1M);
  const hasSvgAsChild = /* @__PURE__ */ reactExports.isValidElement(children) && children.type === "svg";
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    fontSize,
    instanceFontSize: inProps.fontSize,
    inheritViewBox,
    viewBox,
    hasSvgAsChild
  });
  const more = {};
  if (!inheritViewBox) {
    more.viewBox = viewBox;
  }
  const classes = useUtilityClasses$1z(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SvgIconRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    focusable: "false",
    color: htmlColor,
    "aria-hidden": titleAccess ? void 0 : true,
    role: titleAccess ? "img" : void 0,
    ref
  }, more, other, hasSvgAsChild && children.props, {
    ownerState,
    children: [hasSvgAsChild ? children.props.children : children, titleAccess ? /* @__PURE__ */ jsxRuntimeExports.jsx("title", {
      children: titleAccess
    }) : null]
  }));
});
SvgIcon.muiName = "SvgIcon";
function createSvgIcon$1(path, displayName) {
  function Component(props, ref) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SvgIcon, _extends({
      "data-testid": `${displayName}Icon`,
      ref
    }, props, {
      children: path
    }));
  }
  Component.muiName = SvgIcon.muiName;
  return /* @__PURE__ */ reactExports.memo(/* @__PURE__ */ reactExports.forwardRef(Component));
}
const unstable_ClassNameGenerator = {
  configure: (generator) => {
    ClassNameGenerator.configure(generator);
  }
};
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  capitalize: capitalize$1,
  createChainedFunction,
  createSvgIcon: createSvgIcon$1,
  debounce,
  deprecatedPropType,
  isMuiElement,
  ownerDocument,
  ownerWindow,
  requirePropFactory,
  setRef,
  unstable_ClassNameGenerator,
  unstable_useEnhancedEffect: useEnhancedEffect,
  unstable_useId: useId,
  unsupportedProp,
  useControlled,
  useEventCallback,
  useForkRef,
  useIsFocusVisible
}, Symbol.toStringTag, { value: "Module" }));
const ListContext = /* @__PURE__ */ reactExports.createContext({});
function getDividerUtilityClass(slot) {
  return generateUtilityClass$2("MuiDivider", slot);
}
const dividerClasses = generateUtilityClasses("MuiDivider", ["root", "absolute", "fullWidth", "inset", "middle", "flexItem", "light", "vertical", "withChildren", "withChildrenVertical", "textAlignRight", "textAlignLeft", "wrapper", "wrapperVertical"]);
const _excluded$1L = ["absolute", "children", "className", "component", "flexItem", "light", "orientation", "role", "textAlign", "variant"];
const useUtilityClasses$1y = (ownerState) => {
  const {
    absolute,
    children,
    classes,
    flexItem,
    light: light2,
    orientation,
    textAlign,
    variant
  } = ownerState;
  const slots = {
    root: ["root", absolute && "absolute", variant, light2 && "light", orientation === "vertical" && "vertical", flexItem && "flexItem", children && "withChildren", children && orientation === "vertical" && "withChildrenVertical", textAlign === "right" && orientation !== "vertical" && "textAlignRight", textAlign === "left" && orientation !== "vertical" && "textAlignLeft"],
    wrapper: ["wrapper", orientation === "vertical" && "wrapperVertical"]
  };
  return composeClasses(slots, getDividerUtilityClass, classes);
};
const DividerRoot = styled("div", {
  name: "MuiDivider",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.absolute && styles2.absolute, styles2[ownerState.variant], ownerState.light && styles2.light, ownerState.orientation === "vertical" && styles2.vertical, ownerState.flexItem && styles2.flexItem, ownerState.children && styles2.withChildren, ownerState.children && ownerState.orientation === "vertical" && styles2.withChildrenVertical, ownerState.textAlign === "right" && ownerState.orientation !== "vertical" && styles2.textAlignRight, ownerState.textAlign === "left" && ownerState.orientation !== "vertical" && styles2.textAlignLeft];
  }
})(({
  theme,
  ownerState
}) => _extends({
  margin: 0,
  // Reset browser default style.
  flexShrink: 0,
  borderWidth: 0,
  borderStyle: "solid",
  borderColor: (theme.vars || theme).palette.divider,
  borderBottomWidth: "thin"
}, ownerState.absolute && {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%"
}, ownerState.light && {
  borderColor: theme.vars ? `rgba(${theme.vars.palette.dividerChannel} / 0.08)` : alpha_1(theme.palette.divider, 0.08)
}, ownerState.variant === "inset" && {
  marginLeft: 72
}, ownerState.variant === "middle" && ownerState.orientation === "horizontal" && {
  marginLeft: theme.spacing(2),
  marginRight: theme.spacing(2)
}, ownerState.variant === "middle" && ownerState.orientation === "vertical" && {
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1)
}, ownerState.orientation === "vertical" && {
  height: "100%",
  borderBottomWidth: 0,
  borderRightWidth: "thin"
}, ownerState.flexItem && {
  alignSelf: "stretch",
  height: "auto"
}), ({
  ownerState
}) => _extends({}, ownerState.children && {
  display: "flex",
  whiteSpace: "nowrap",
  textAlign: "center",
  border: 0,
  "&::before, &::after": {
    content: '""',
    alignSelf: "center"
  }
}), ({
  theme,
  ownerState
}) => _extends({}, ownerState.children && ownerState.orientation !== "vertical" && {
  "&::before, &::after": {
    width: "100%",
    borderTop: `thin solid ${(theme.vars || theme).palette.divider}`
  }
}), ({
  theme,
  ownerState
}) => _extends({}, ownerState.children && ownerState.orientation === "vertical" && {
  flexDirection: "column",
  "&::before, &::after": {
    height: "100%",
    borderLeft: `thin solid ${(theme.vars || theme).palette.divider}`
  }
}), ({
  ownerState
}) => _extends({}, ownerState.textAlign === "right" && ownerState.orientation !== "vertical" && {
  "&::before": {
    width: "90%"
  },
  "&::after": {
    width: "10%"
  }
}, ownerState.textAlign === "left" && ownerState.orientation !== "vertical" && {
  "&::before": {
    width: "10%"
  },
  "&::after": {
    width: "90%"
  }
}));
const DividerWrapper = styled("span", {
  name: "MuiDivider",
  slot: "Wrapper",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.wrapper, ownerState.orientation === "vertical" && styles2.wrapperVertical];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "inline-block",
  paddingLeft: `calc(${theme.spacing(1)} * 1.2)`,
  paddingRight: `calc(${theme.spacing(1)} * 1.2)`
}, ownerState.orientation === "vertical" && {
  paddingTop: `calc(${theme.spacing(1)} * 1.2)`,
  paddingBottom: `calc(${theme.spacing(1)} * 1.2)`
}));
const Divider = /* @__PURE__ */ reactExports.forwardRef(function Divider2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDivider"
  });
  const {
    absolute = false,
    children,
    className,
    component = children ? "div" : "hr",
    flexItem = false,
    light: light2 = false,
    orientation = "horizontal",
    role = component !== "hr" ? "separator" : void 0,
    textAlign = "center",
    variant = "fullWidth"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1L);
  const ownerState = _extends({}, props, {
    absolute,
    component,
    flexItem,
    light: light2,
    orientation,
    role,
    textAlign,
    variant
  });
  const classes = useUtilityClasses$1y(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DividerRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    role,
    ref,
    ownerState
  }, other, {
    children: children ? /* @__PURE__ */ jsxRuntimeExports.jsx(DividerWrapper, {
      className: classes.wrapper,
      ownerState,
      children
    }) : null
  }));
});
Divider.muiSkipListHighlight = true;
function getListItemIconUtilityClass(slot) {
  return generateUtilityClass$2("MuiListItemIcon", slot);
}
const listItemIconClasses = generateUtilityClasses("MuiListItemIcon", ["root", "alignItemsFlexStart"]);
const _excluded$1K = ["className"];
const useUtilityClasses$1x = (ownerState) => {
  const {
    alignItems,
    classes
  } = ownerState;
  const slots = {
    root: ["root", alignItems === "flex-start" && "alignItemsFlexStart"]
  };
  return composeClasses(slots, getListItemIconUtilityClass, classes);
};
const ListItemIconRoot = styled("div", {
  name: "MuiListItemIcon",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.alignItems === "flex-start" && styles2.alignItemsFlexStart];
  }
})(({
  theme,
  ownerState
}) => _extends({
  minWidth: 56,
  color: (theme.vars || theme).palette.action.active,
  flexShrink: 0,
  display: "inline-flex"
}, ownerState.alignItems === "flex-start" && {
  marginTop: 8
}));
const ListItemIcon = /* @__PURE__ */ reactExports.forwardRef(function ListItemIcon2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListItemIcon"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1K);
  const context = reactExports.useContext(ListContext);
  const ownerState = _extends({}, props, {
    alignItems: context.alignItems
  });
  const classes = useUtilityClasses$1x(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIconRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getListItemTextUtilityClass(slot) {
  return generateUtilityClass$2("MuiListItemText", slot);
}
const listItemTextClasses = generateUtilityClasses("MuiListItemText", ["root", "multiline", "dense", "inset", "primary", "secondary"]);
const _excluded$1J = ["children", "className", "disableTypography", "inset", "primary", "primaryTypographyProps", "secondary", "secondaryTypographyProps"];
const useUtilityClasses$1w = (ownerState) => {
  const {
    classes,
    inset,
    primary,
    secondary,
    dense
  } = ownerState;
  const slots = {
    root: ["root", inset && "inset", dense && "dense", primary && secondary && "multiline"],
    primary: ["primary"],
    secondary: ["secondary"]
  };
  return composeClasses(slots, getListItemTextUtilityClass, classes);
};
const ListItemTextRoot = styled("div", {
  name: "MuiListItemText",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${listItemTextClasses.primary}`]: styles2.primary
    }, {
      [`& .${listItemTextClasses.secondary}`]: styles2.secondary
    }, styles2.root, ownerState.inset && styles2.inset, ownerState.primary && ownerState.secondary && styles2.multiline, ownerState.dense && styles2.dense];
  }
})(({
  ownerState
}) => _extends({
  flex: "1 1 auto",
  minWidth: 0,
  marginTop: 4,
  marginBottom: 4
}, ownerState.primary && ownerState.secondary && {
  marginTop: 6,
  marginBottom: 6
}, ownerState.inset && {
  paddingLeft: 56
}));
const ListItemText = /* @__PURE__ */ reactExports.forwardRef(function ListItemText2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListItemText"
  });
  const {
    children,
    className,
    disableTypography = false,
    inset = false,
    primary: primaryProp,
    primaryTypographyProps,
    secondary: secondaryProp,
    secondaryTypographyProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1J);
  const {
    dense
  } = reactExports.useContext(ListContext);
  let primary = primaryProp != null ? primaryProp : children;
  let secondary = secondaryProp;
  const ownerState = _extends({}, props, {
    disableTypography,
    inset,
    primary: !!primary,
    secondary: !!secondary,
    dense
  });
  const classes = useUtilityClasses$1w(ownerState);
  if (primary != null && primary.type !== Typography && !disableTypography) {
    primary = /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, _extends({
      variant: dense ? "body2" : "body1",
      className: classes.primary,
      component: primaryTypographyProps != null && primaryTypographyProps.variant ? void 0 : "span",
      display: "block"
    }, primaryTypographyProps, {
      children: primary
    }));
  }
  if (secondary != null && secondary.type !== Typography && !disableTypography) {
    secondary = /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, _extends({
      variant: "body2",
      className: classes.secondary,
      color: "text.secondary",
      display: "block"
    }, secondaryTypographyProps, {
      children: secondary
    }));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListItemTextRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other, {
    children: [primary, secondary]
  }));
});
function getMenuItemUtilityClass(slot) {
  return generateUtilityClass$2("MuiMenuItem", slot);
}
const menuItemClasses = generateUtilityClasses("MuiMenuItem", ["root", "focusVisible", "dense", "disabled", "divider", "gutters", "selected"]);
const _excluded$1I = ["autoFocus", "component", "dense", "divider", "disableGutters", "focusVisibleClassName", "role", "tabIndex", "className"];
const overridesResolver$5 = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, ownerState.dense && styles2.dense, ownerState.divider && styles2.divider, !ownerState.disableGutters && styles2.gutters];
};
const useUtilityClasses$1v = (ownerState) => {
  const {
    disabled,
    dense,
    divider,
    disableGutters,
    selected,
    classes
  } = ownerState;
  const slots = {
    root: ["root", dense && "dense", disabled && "disabled", !disableGutters && "gutters", divider && "divider", selected && "selected"]
  };
  const composedClasses = composeClasses(slots, getMenuItemUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const MenuItemRoot = styled(ButtonBase, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiMenuItem",
  slot: "Root",
  overridesResolver: overridesResolver$5
})(({
  theme,
  ownerState
}) => _extends({}, theme.typography.body1, {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  position: "relative",
  textDecoration: "none",
  minHeight: 48,
  paddingTop: 6,
  paddingBottom: 6,
  boxSizing: "border-box",
  whiteSpace: "nowrap"
}, !ownerState.disableGutters && {
  paddingLeft: 16,
  paddingRight: 16
}, ownerState.divider && {
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
  backgroundClip: "padding-box"
}, {
  "&:hover": {
    textDecoration: "none",
    backgroundColor: (theme.vars || theme).palette.action.hover,
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  },
  [`&.${menuItemClasses.selected}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    [`&.${menuItemClasses.focusVisible}`]: {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
    }
  },
  [`&.${menuItemClasses.selected}:hover`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity)
    }
  },
  [`&.${menuItemClasses.focusVisible}`]: {
    backgroundColor: (theme.vars || theme).palette.action.focus
  },
  [`&.${menuItemClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity
  },
  [`& + .${dividerClasses.root}`]: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  [`& + .${dividerClasses.inset}`]: {
    marginLeft: 52
  },
  [`& .${listItemTextClasses.root}`]: {
    marginTop: 0,
    marginBottom: 0
  },
  [`& .${listItemTextClasses.inset}`]: {
    paddingLeft: 36
  },
  [`& .${listItemIconClasses.root}`]: {
    minWidth: 36
  }
}, !ownerState.dense && {
  [theme.breakpoints.up("sm")]: {
    minHeight: "auto"
  }
}, ownerState.dense && _extends({
  minHeight: 32,
  // https://m2.material.io/components/menus#specs > Dense
  paddingTop: 4,
  paddingBottom: 4
}, theme.typography.body2, {
  [`& .${listItemIconClasses.root} svg`]: {
    fontSize: "1.25rem"
  }
})));
const MenuItem = /* @__PURE__ */ reactExports.forwardRef(function MenuItem2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiMenuItem"
  });
  const {
    autoFocus = false,
    component = "li",
    dense = false,
    divider = false,
    disableGutters = false,
    focusVisibleClassName,
    role = "menuitem",
    tabIndex: tabIndexProp,
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1I);
  const context = reactExports.useContext(ListContext);
  const childContext = reactExports.useMemo(() => ({
    dense: dense || context.dense || false,
    disableGutters
  }), [context.dense, dense, disableGutters]);
  const menuItemRef = reactExports.useRef(null);
  useEnhancedEffect(() => {
    if (autoFocus) {
      if (menuItemRef.current) {
        menuItemRef.current.focus();
      }
    }
  }, [autoFocus]);
  const ownerState = _extends({}, props, {
    dense: childContext.dense,
    divider,
    disableGutters
  });
  const classes = useUtilityClasses$1v(props);
  const handleRef = useForkRef(menuItemRef, ref);
  let tabIndex;
  if (!props.disabled) {
    tabIndex = tabIndexProp !== void 0 ? tabIndexProp : -1;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListContext.Provider, {
    value: childContext,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItemRoot, _extends({
      ref: handleRef,
      role,
      tabIndex,
      component,
      focusVisibleClassName: clsx(classes.focusVisible, focusVisibleClassName),
      className: clsx(classes.root, className)
    }, other, {
      ownerState,
      classes
    }))
  });
});
var reactIs_production_min = {};
/**
 * @license React
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var b = Symbol.for("react.element"), c = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), e = Symbol.for("react.strict_mode"), f = Symbol.for("react.profiler"), g = Symbol.for("react.provider"), h = Symbol.for("react.context"), k = Symbol.for("react.server_context"), l = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), n = Symbol.for("react.suspense_list"), p = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), t = Symbol.for("react.offscreen"), u;
u = Symbol.for("react.module.reference");
function v(a) {
  if ("object" === typeof a && null !== a) {
    var r = a.$$typeof;
    switch (r) {
      case b:
        switch (a = a.type, a) {
          case d:
          case f:
          case e:
          case m:
          case n:
            return a;
          default:
            switch (a = a && a.$$typeof, a) {
              case k:
              case h:
              case l:
              case q:
              case p:
              case g:
                return a;
              default:
                return r;
            }
        }
      case c:
        return r;
    }
  }
}
reactIs_production_min.ContextConsumer = h;
reactIs_production_min.ContextProvider = g;
reactIs_production_min.Element = b;
reactIs_production_min.ForwardRef = l;
reactIs_production_min.Fragment = d;
reactIs_production_min.Lazy = q;
reactIs_production_min.Memo = p;
reactIs_production_min.Portal = c;
reactIs_production_min.Profiler = f;
reactIs_production_min.StrictMode = e;
reactIs_production_min.Suspense = m;
reactIs_production_min.SuspenseList = n;
reactIs_production_min.isAsyncMode = function() {
  return false;
};
reactIs_production_min.isConcurrentMode = function() {
  return false;
};
reactIs_production_min.isContextConsumer = function(a) {
  return v(a) === h;
};
reactIs_production_min.isContextProvider = function(a) {
  return v(a) === g;
};
reactIs_production_min.isElement = function(a) {
  return "object" === typeof a && null !== a && a.$$typeof === b;
};
reactIs_production_min.isForwardRef = function(a) {
  return v(a) === l;
};
reactIs_production_min.isFragment = function(a) {
  return v(a) === d;
};
reactIs_production_min.isLazy = function(a) {
  return v(a) === q;
};
reactIs_production_min.isMemo = function(a) {
  return v(a) === p;
};
reactIs_production_min.isPortal = function(a) {
  return v(a) === c;
};
reactIs_production_min.isProfiler = function(a) {
  return v(a) === f;
};
reactIs_production_min.isStrictMode = function(a) {
  return v(a) === e;
};
reactIs_production_min.isSuspense = function(a) {
  return v(a) === m;
};
reactIs_production_min.isSuspenseList = function(a) {
  return v(a) === n;
};
reactIs_production_min.isValidElementType = function(a) {
  return "string" === typeof a || "function" === typeof a || a === d || a === f || a === e || a === m || a === n || a === t || "object" === typeof a && null !== a && (a.$$typeof === q || a.$$typeof === p || a.$$typeof === g || a.$$typeof === h || a.$$typeof === l || a.$$typeof === u || void 0 !== a.getModuleId) ? true : false;
};
reactIs_production_min.typeOf = v;
function getListUtilityClass(slot) {
  return generateUtilityClass$2("MuiList", slot);
}
generateUtilityClasses("MuiList", ["root", "padding", "dense", "subheader"]);
const _excluded$1H = ["children", "className", "component", "dense", "disablePadding", "subheader"];
const useUtilityClasses$1u = (ownerState) => {
  const {
    classes,
    disablePadding,
    dense,
    subheader
  } = ownerState;
  const slots = {
    root: ["root", !disablePadding && "padding", dense && "dense", subheader && "subheader"]
  };
  return composeClasses(slots, getListUtilityClass, classes);
};
const ListRoot = styled("ul", {
  name: "MuiList",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, !ownerState.disablePadding && styles2.padding, ownerState.dense && styles2.dense, ownerState.subheader && styles2.subheader];
  }
})(({
  ownerState
}) => _extends({
  listStyle: "none",
  margin: 0,
  padding: 0,
  position: "relative"
}, !ownerState.disablePadding && {
  paddingTop: 8,
  paddingBottom: 8
}, ownerState.subheader && {
  paddingTop: 0
}));
const List = /* @__PURE__ */ reactExports.forwardRef(function List2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiList"
  });
  const {
    children,
    className,
    component = "ul",
    dense = false,
    disablePadding = false,
    subheader
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1H);
  const context = reactExports.useMemo(() => ({
    dense
  }), [dense]);
  const ownerState = _extends({}, props, {
    component,
    dense,
    disablePadding
  });
  const classes = useUtilityClasses$1u(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListContext.Provider, {
    value: context,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ListRoot, _extends({
      as: component,
      className: clsx(classes.root, className),
      ref,
      ownerState
    }, other, {
      children: [subheader, children]
    }))
  });
});
const _excluded$1G = ["actions", "autoFocus", "autoFocusItem", "children", "className", "disabledItemsFocusable", "disableListWrap", "onKeyDown", "variant"];
function nextItem$1(list, item, disableListWrap) {
  if (list === item) {
    return list.firstChild;
  }
  if (item && item.nextElementSibling) {
    return item.nextElementSibling;
  }
  return disableListWrap ? null : list.firstChild;
}
function previousItem$1(list, item, disableListWrap) {
  if (list === item) {
    return disableListWrap ? list.firstChild : list.lastChild;
  }
  if (item && item.previousElementSibling) {
    return item.previousElementSibling;
  }
  return disableListWrap ? null : list.lastChild;
}
function textCriteriaMatches(nextFocus, textCriteria) {
  if (textCriteria === void 0) {
    return true;
  }
  let text = nextFocus.innerText;
  if (text === void 0) {
    text = nextFocus.textContent;
  }
  text = text.trim().toLowerCase();
  if (text.length === 0) {
    return false;
  }
  if (textCriteria.repeating) {
    return text[0] === textCriteria.keys[0];
  }
  return text.indexOf(textCriteria.keys.join("")) === 0;
}
function moveFocus$1(list, currentFocus, disableListWrap, disabledItemsFocusable, traversalFunction, textCriteria) {
  let wrappedOnce = false;
  let nextFocus = traversalFunction(list, currentFocus, currentFocus ? disableListWrap : false);
  while (nextFocus) {
    if (nextFocus === list.firstChild) {
      if (wrappedOnce) {
        return false;
      }
      wrappedOnce = true;
    }
    const nextFocusDisabled = disabledItemsFocusable ? false : nextFocus.disabled || nextFocus.getAttribute("aria-disabled") === "true";
    if (!nextFocus.hasAttribute("tabindex") || !textCriteriaMatches(nextFocus, textCriteria) || nextFocusDisabled) {
      nextFocus = traversalFunction(list, nextFocus, disableListWrap);
    } else {
      nextFocus.focus();
      return true;
    }
  }
  return false;
}
const MenuList = /* @__PURE__ */ reactExports.forwardRef(function MenuList2(props, ref) {
  const {
    // private
    // eslint-disable-next-line react/prop-types
    actions,
    autoFocus = false,
    autoFocusItem = false,
    children,
    className,
    disabledItemsFocusable = false,
    disableListWrap = false,
    onKeyDown,
    variant = "selectedMenu"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1G);
  const listRef = reactExports.useRef(null);
  const textCriteriaRef = reactExports.useRef({
    keys: [],
    repeating: true,
    previousKeyMatched: true,
    lastTime: null
  });
  useEnhancedEffect(() => {
    if (autoFocus) {
      listRef.current.focus();
    }
  }, [autoFocus]);
  reactExports.useImperativeHandle(actions, () => ({
    adjustStyleForScrollbar: (containerElement, {
      direction
    }) => {
      const noExplicitWidth = !listRef.current.style.width;
      if (containerElement.clientHeight < listRef.current.clientHeight && noExplicitWidth) {
        const scrollbarSize = `${getScrollbarSize(ownerDocument(containerElement))}px`;
        listRef.current.style[direction === "rtl" ? "paddingLeft" : "paddingRight"] = scrollbarSize;
        listRef.current.style.width = `calc(100% + ${scrollbarSize})`;
      }
      return listRef.current;
    }
  }), []);
  const handleKeyDown2 = (event) => {
    const list = listRef.current;
    const key = event.key;
    const currentFocus = ownerDocument(list).activeElement;
    if (key === "ArrowDown") {
      event.preventDefault();
      moveFocus$1(list, currentFocus, disableListWrap, disabledItemsFocusable, nextItem$1);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      moveFocus$1(list, currentFocus, disableListWrap, disabledItemsFocusable, previousItem$1);
    } else if (key === "Home") {
      event.preventDefault();
      moveFocus$1(list, null, disableListWrap, disabledItemsFocusable, nextItem$1);
    } else if (key === "End") {
      event.preventDefault();
      moveFocus$1(list, null, disableListWrap, disabledItemsFocusable, previousItem$1);
    } else if (key.length === 1) {
      const criteria = textCriteriaRef.current;
      const lowerKey = key.toLowerCase();
      const currTime = performance.now();
      if (criteria.keys.length > 0) {
        if (currTime - criteria.lastTime > 500) {
          criteria.keys = [];
          criteria.repeating = true;
          criteria.previousKeyMatched = true;
        } else if (criteria.repeating && lowerKey !== criteria.keys[0]) {
          criteria.repeating = false;
        }
      }
      criteria.lastTime = currTime;
      criteria.keys.push(lowerKey);
      const keepFocusOnCurrent = currentFocus && !criteria.repeating && textCriteriaMatches(currentFocus, criteria);
      if (criteria.previousKeyMatched && (keepFocusOnCurrent || moveFocus$1(list, currentFocus, false, disabledItemsFocusable, nextItem$1, criteria))) {
        event.preventDefault();
      } else {
        criteria.previousKeyMatched = false;
      }
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
  };
  const handleRef = useForkRef(listRef, ref);
  let activeItemIndex = -1;
  reactExports.Children.forEach(children, (child, index) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(child)) {
      if (activeItemIndex === index) {
        activeItemIndex += 1;
        if (activeItemIndex >= children.length) {
          activeItemIndex = -1;
        }
      }
      return;
    }
    if (!child.props.disabled) {
      if (variant === "selectedMenu" && child.props.selected) {
        activeItemIndex = index;
      } else if (activeItemIndex === -1) {
        activeItemIndex = index;
      }
    }
    if (activeItemIndex === index && (child.props.disabled || child.props.muiSkipListHighlight || child.type.muiSkipListHighlight)) {
      activeItemIndex += 1;
      if (activeItemIndex >= children.length) {
        activeItemIndex = -1;
      }
    }
  });
  const items = reactExports.Children.map(children, (child, index) => {
    if (index === activeItemIndex) {
      const newChildProps = {};
      if (autoFocusItem) {
        newChildProps.autoFocus = true;
      }
      if (child.props.tabIndex === void 0 && variant === "selectedMenu") {
        newChildProps.tabIndex = 0;
      }
      return /* @__PURE__ */ reactExports.cloneElement(child, newChildProps);
    }
    return child;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(List, _extends({
    role: "menu",
    ref: handleRef,
    className,
    onKeyDown: handleKeyDown2,
    tabIndex: autoFocus ? 0 : -1
  }, other, {
    children: items
  }));
});
function isHostComponent(element) {
  return typeof element === "string";
}
function appendOwnerState(elementType, otherProps, ownerState) {
  if (elementType === void 0 || isHostComponent(elementType)) {
    return otherProps;
  }
  return _extends({}, otherProps, {
    ownerState: _extends({}, otherProps.ownerState, ownerState)
  });
}
function areArraysEqual(array1, array2, itemComparer = (a, b2) => a === b2) {
  return array1.length === array2.length && array1.every((value, index) => itemComparer(value, array2[index]));
}
const defaultContextValue = {
  disableDefaultClasses: false
};
const ClassNameConfiguratorContext = /* @__PURE__ */ reactExports.createContext(defaultContextValue);
function useClassNamesOverride(generateUtilityClass2) {
  const {
    disableDefaultClasses
  } = reactExports.useContext(ClassNameConfiguratorContext);
  return (slot) => {
    if (disableDefaultClasses) {
      return "";
    }
    return generateUtilityClass2(slot);
  };
}
function extractEventHandlers(object, excludeKeys = []) {
  if (object === void 0) {
    return {};
  }
  const result = {};
  Object.keys(object).filter((prop) => prop.match(/^on[A-Z]/) && typeof object[prop] === "function" && !excludeKeys.includes(prop)).forEach((prop) => {
    result[prop] = object[prop];
  });
  return result;
}
function resolveComponentProps(componentProps, ownerState, slotState) {
  if (typeof componentProps === "function") {
    return componentProps(ownerState, slotState);
  }
  return componentProps;
}
function omitEventHandlers(object) {
  if (object === void 0) {
    return {};
  }
  const result = {};
  Object.keys(object).filter((prop) => !(prop.match(/^on[A-Z]/) && typeof object[prop] === "function")).forEach((prop) => {
    result[prop] = object[prop];
  });
  return result;
}
function mergeSlotProps(parameters) {
  const {
    getSlotProps,
    additionalProps,
    externalSlotProps,
    externalForwardedProps,
    className
  } = parameters;
  if (!getSlotProps) {
    const joinedClasses2 = clsx(additionalProps == null ? void 0 : additionalProps.className, className, externalForwardedProps == null ? void 0 : externalForwardedProps.className, externalSlotProps == null ? void 0 : externalSlotProps.className);
    const mergedStyle2 = _extends({}, additionalProps == null ? void 0 : additionalProps.style, externalForwardedProps == null ? void 0 : externalForwardedProps.style, externalSlotProps == null ? void 0 : externalSlotProps.style);
    const props2 = _extends({}, additionalProps, externalForwardedProps, externalSlotProps);
    if (joinedClasses2.length > 0) {
      props2.className = joinedClasses2;
    }
    if (Object.keys(mergedStyle2).length > 0) {
      props2.style = mergedStyle2;
    }
    return {
      props: props2,
      internalRef: void 0
    };
  }
  const eventHandlers = extractEventHandlers(_extends({}, externalForwardedProps, externalSlotProps));
  const componentsPropsWithoutEventHandlers = omitEventHandlers(externalSlotProps);
  const otherPropsWithoutEventHandlers = omitEventHandlers(externalForwardedProps);
  const internalSlotProps = getSlotProps(eventHandlers);
  const joinedClasses = clsx(internalSlotProps == null ? void 0 : internalSlotProps.className, additionalProps == null ? void 0 : additionalProps.className, className, externalForwardedProps == null ? void 0 : externalForwardedProps.className, externalSlotProps == null ? void 0 : externalSlotProps.className);
  const mergedStyle = _extends({}, internalSlotProps == null ? void 0 : internalSlotProps.style, additionalProps == null ? void 0 : additionalProps.style, externalForwardedProps == null ? void 0 : externalForwardedProps.style, externalSlotProps == null ? void 0 : externalSlotProps.style);
  const props = _extends({}, internalSlotProps, additionalProps, otherPropsWithoutEventHandlers, componentsPropsWithoutEventHandlers);
  if (joinedClasses.length > 0) {
    props.className = joinedClasses;
  }
  if (Object.keys(mergedStyle).length > 0) {
    props.style = mergedStyle;
  }
  return {
    props,
    internalRef: internalSlotProps.ref
  };
}
const _excluded$1F = ["elementType", "externalSlotProps", "ownerState", "skipResolvingSlotProps"];
function useSlotProps(parameters) {
  var _parameters$additiona;
  const {
    elementType,
    externalSlotProps,
    ownerState,
    skipResolvingSlotProps = false
  } = parameters, rest = _objectWithoutPropertiesLoose(parameters, _excluded$1F);
  const resolvedComponentsProps = skipResolvingSlotProps ? {} : resolveComponentProps(externalSlotProps, ownerState);
  const {
    props: mergedProps,
    internalRef
  } = mergeSlotProps(_extends({}, rest, {
    externalSlotProps: resolvedComponentsProps
  }));
  const ref = useForkRef(internalRef, resolvedComponentsProps == null ? void 0 : resolvedComponentsProps.ref, (_parameters$additiona = parameters.additionalProps) == null ? void 0 : _parameters$additiona.ref);
  const props = appendOwnerState(elementType, _extends({}, mergedProps, {
    ref
  }), ownerState);
  return props;
}
function useBadge(parameters) {
  const {
    badgeContent: badgeContentProp,
    invisible: invisibleProp = false,
    max: maxProp = 99,
    showZero = false
  } = parameters;
  const prevProps = usePreviousProps({
    badgeContent: badgeContentProp,
    max: maxProp
  });
  let invisible = invisibleProp;
  if (invisibleProp === false && badgeContentProp === 0 && !showZero) {
    invisible = true;
  }
  const {
    badgeContent,
    max = maxProp
  } = invisible ? prevProps : parameters;
  const displayValue = badgeContent && Number(badgeContent) > max ? `${max}+` : badgeContent;
  return {
    badgeContent,
    invisible,
    max,
    displayValue
  };
}
const GLOBAL_CLASS_PREFIX$1 = "base";
function buildStateClass$1(state) {
  return `${GLOBAL_CLASS_PREFIX$1}--${state}`;
}
function buildSlotClass$1(componentName, slot) {
  return `${GLOBAL_CLASS_PREFIX$1}-${componentName}-${slot}`;
}
function generateUtilityClass$1(componentName, slot) {
  const globalStateClass = globalStateClasses[slot];
  return globalStateClass ? buildStateClass$1(globalStateClass) : buildSlotClass$1(componentName, slot);
}
function mapEventPropToEvent(eventProp) {
  return eventProp.substring(2).toLowerCase();
}
function clickedRootScrollbar(event, doc) {
  return doc.documentElement.clientWidth < event.clientX || doc.documentElement.clientHeight < event.clientY;
}
function ClickAwayListener(props) {
  const {
    children,
    disableReactTree = false,
    mouseEvent = "onClick",
    onClickAway,
    touchEvent = "onTouchEnd"
  } = props;
  const movedRef = reactExports.useRef(false);
  const nodeRef = reactExports.useRef(null);
  const activatedRef = reactExports.useRef(false);
  const syntheticEventRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    setTimeout(() => {
      activatedRef.current = true;
    }, 0);
    return () => {
      activatedRef.current = false;
    };
  }, []);
  const handleRef = useForkRef(
    // @ts-expect-error TODO upstream fix
    children.ref,
    nodeRef
  );
  const handleClickAway = useEventCallback((event) => {
    const insideReactTree = syntheticEventRef.current;
    syntheticEventRef.current = false;
    const doc = ownerDocument(nodeRef.current);
    if (!activatedRef.current || !nodeRef.current || "clientX" in event && clickedRootScrollbar(event, doc)) {
      return;
    }
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    let insideDOM;
    if (event.composedPath) {
      insideDOM = event.composedPath().indexOf(nodeRef.current) > -1;
    } else {
      insideDOM = !doc.documentElement.contains(
        // @ts-expect-error returns `false` as intended when not dispatched from a Node
        event.target
      ) || nodeRef.current.contains(
        // @ts-expect-error returns `false` as intended when not dispatched from a Node
        event.target
      );
    }
    if (!insideDOM && (disableReactTree || !insideReactTree)) {
      onClickAway(event);
    }
  });
  const createHandleSynthetic = (handlerName) => (event) => {
    syntheticEventRef.current = true;
    const childrenPropsHandler = children.props[handlerName];
    if (childrenPropsHandler) {
      childrenPropsHandler(event);
    }
  };
  const childrenProps = {
    ref: handleRef
  };
  if (touchEvent !== false) {
    childrenProps[touchEvent] = createHandleSynthetic(touchEvent);
  }
  reactExports.useEffect(() => {
    if (touchEvent !== false) {
      const mappedTouchEvent = mapEventPropToEvent(touchEvent);
      const doc = ownerDocument(nodeRef.current);
      const handleTouchMove = () => {
        movedRef.current = true;
      };
      doc.addEventListener(mappedTouchEvent, handleClickAway);
      doc.addEventListener("touchmove", handleTouchMove);
      return () => {
        doc.removeEventListener(mappedTouchEvent, handleClickAway);
        doc.removeEventListener("touchmove", handleTouchMove);
      };
    }
    return void 0;
  }, [handleClickAway, touchEvent]);
  if (mouseEvent !== false) {
    childrenProps[mouseEvent] = createHandleSynthetic(mouseEvent);
  }
  reactExports.useEffect(() => {
    if (mouseEvent !== false) {
      const mappedMouseEvent = mapEventPropToEvent(mouseEvent);
      const doc = ownerDocument(nodeRef.current);
      doc.addEventListener(mappedMouseEvent, handleClickAway);
      return () => {
        doc.removeEventListener(mappedMouseEvent, handleClickAway);
      };
    }
    return void 0;
  }, [handleClickAway, mouseEvent]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: /* @__PURE__ */ reactExports.cloneElement(children, childrenProps)
  });
}
const candidatesSelector = ["input", "select", "textarea", "a[href]", "button", "[tabindex]", "audio[controls]", "video[controls]", '[contenteditable]:not([contenteditable="false"])'].join(",");
function getTabIndex(node) {
  const tabindexAttr = parseInt(node.getAttribute("tabindex") || "", 10);
  if (!Number.isNaN(tabindexAttr)) {
    return tabindexAttr;
  }
  if (node.contentEditable === "true" || (node.nodeName === "AUDIO" || node.nodeName === "VIDEO" || node.nodeName === "DETAILS") && node.getAttribute("tabindex") === null) {
    return 0;
  }
  return node.tabIndex;
}
function isNonTabbableRadio(node) {
  if (node.tagName !== "INPUT" || node.type !== "radio") {
    return false;
  }
  if (!node.name) {
    return false;
  }
  const getRadio = (selector) => node.ownerDocument.querySelector(`input[type="radio"]${selector}`);
  let roving = getRadio(`[name="${node.name}"]:checked`);
  if (!roving) {
    roving = getRadio(`[name="${node.name}"]`);
  }
  return roving !== node;
}
function isNodeMatchingSelectorFocusable(node) {
  if (node.disabled || node.tagName === "INPUT" && node.type === "hidden" || isNonTabbableRadio(node)) {
    return false;
  }
  return true;
}
function defaultGetTabbable(root) {
  const regularTabNodes = [];
  const orderedTabNodes = [];
  Array.from(root.querySelectorAll(candidatesSelector)).forEach((node, i) => {
    const nodeTabIndex = getTabIndex(node);
    if (nodeTabIndex === -1 || !isNodeMatchingSelectorFocusable(node)) {
      return;
    }
    if (nodeTabIndex === 0) {
      regularTabNodes.push(node);
    } else {
      orderedTabNodes.push({
        documentOrder: i,
        tabIndex: nodeTabIndex,
        node
      });
    }
  });
  return orderedTabNodes.sort((a, b2) => a.tabIndex === b2.tabIndex ? a.documentOrder - b2.documentOrder : a.tabIndex - b2.tabIndex).map((a) => a.node).concat(regularTabNodes);
}
function defaultIsEnabled() {
  return true;
}
function FocusTrap(props) {
  const {
    children,
    disableAutoFocus = false,
    disableEnforceFocus = false,
    disableRestoreFocus = false,
    getTabbable = defaultGetTabbable,
    isEnabled = defaultIsEnabled,
    open
  } = props;
  const ignoreNextEnforceFocus = reactExports.useRef(false);
  const sentinelStart = reactExports.useRef(null);
  const sentinelEnd = reactExports.useRef(null);
  const nodeToRestore = reactExports.useRef(null);
  const reactFocusEventTarget = reactExports.useRef(null);
  const activated = reactExports.useRef(false);
  const rootRef = reactExports.useRef(null);
  const handleRef = useForkRef(children.ref, rootRef);
  const lastKeydown = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }
    activated.current = !disableAutoFocus;
  }, [disableAutoFocus, open]);
  reactExports.useEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }
    const doc = ownerDocument(rootRef.current);
    if (!rootRef.current.contains(doc.activeElement)) {
      if (!rootRef.current.hasAttribute("tabIndex")) {
        rootRef.current.setAttribute("tabIndex", "-1");
      }
      if (activated.current) {
        rootRef.current.focus();
      }
    }
    return () => {
      if (!disableRestoreFocus) {
        if (nodeToRestore.current && nodeToRestore.current.focus) {
          ignoreNextEnforceFocus.current = true;
          nodeToRestore.current.focus();
        }
        nodeToRestore.current = null;
      }
    };
  }, [open]);
  reactExports.useEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }
    const doc = ownerDocument(rootRef.current);
    const loopFocus = (nativeEvent) => {
      lastKeydown.current = nativeEvent;
      if (disableEnforceFocus || !isEnabled() || nativeEvent.key !== "Tab") {
        return;
      }
      if (doc.activeElement === rootRef.current && nativeEvent.shiftKey) {
        ignoreNextEnforceFocus.current = true;
        if (sentinelEnd.current) {
          sentinelEnd.current.focus();
        }
      }
    };
    const contain = () => {
      const rootElement = rootRef.current;
      if (rootElement === null) {
        return;
      }
      if (!doc.hasFocus() || !isEnabled() || ignoreNextEnforceFocus.current) {
        ignoreNextEnforceFocus.current = false;
        return;
      }
      if (rootElement.contains(doc.activeElement)) {
        return;
      }
      if (disableEnforceFocus && doc.activeElement !== sentinelStart.current && doc.activeElement !== sentinelEnd.current) {
        return;
      }
      if (doc.activeElement !== reactFocusEventTarget.current) {
        reactFocusEventTarget.current = null;
      } else if (reactFocusEventTarget.current !== null) {
        return;
      }
      if (!activated.current) {
        return;
      }
      let tabbable = [];
      if (doc.activeElement === sentinelStart.current || doc.activeElement === sentinelEnd.current) {
        tabbable = getTabbable(rootRef.current);
      }
      if (tabbable.length > 0) {
        var _lastKeydown$current, _lastKeydown$current2;
        const isShiftTab = Boolean(((_lastKeydown$current = lastKeydown.current) == null ? void 0 : _lastKeydown$current.shiftKey) && ((_lastKeydown$current2 = lastKeydown.current) == null ? void 0 : _lastKeydown$current2.key) === "Tab");
        const focusNext = tabbable[0];
        const focusPrevious = tabbable[tabbable.length - 1];
        if (typeof focusNext !== "string" && typeof focusPrevious !== "string") {
          if (isShiftTab) {
            focusPrevious.focus();
          } else {
            focusNext.focus();
          }
        }
      } else {
        rootElement.focus();
      }
    };
    doc.addEventListener("focusin", contain);
    doc.addEventListener("keydown", loopFocus, true);
    const interval = setInterval(() => {
      if (doc.activeElement && doc.activeElement.tagName === "BODY") {
        contain();
      }
    }, 50);
    return () => {
      clearInterval(interval);
      doc.removeEventListener("focusin", contain);
      doc.removeEventListener("keydown", loopFocus, true);
    };
  }, [disableAutoFocus, disableEnforceFocus, disableRestoreFocus, isEnabled, open, getTabbable]);
  const onFocus = (event) => {
    if (nodeToRestore.current === null) {
      nodeToRestore.current = event.relatedTarget;
    }
    activated.current = true;
    reactFocusEventTarget.current = event.target;
    const childrenPropsHandler = children.props.onFocus;
    if (childrenPropsHandler) {
      childrenPropsHandler(event);
    }
  };
  const handleFocusSentinel = (event) => {
    if (nodeToRestore.current === null) {
      nodeToRestore.current = event.relatedTarget;
    }
    activated.current = true;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      tabIndex: open ? 0 : -1,
      onFocus: handleFocusSentinel,
      ref: sentinelStart,
      "data-testid": "sentinelStart"
    }), /* @__PURE__ */ reactExports.cloneElement(children, {
      ref: handleRef,
      onFocus
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      tabIndex: open ? 0 : -1,
      onFocus: handleFocusSentinel,
      ref: sentinelEnd,
      "data-testid": "sentinelEnd"
    })]
  });
}
function getContainer$2(container) {
  return typeof container === "function" ? container() : container;
}
const Portal$1 = /* @__PURE__ */ reactExports.forwardRef(function Portal2(props, forwardedRef) {
  const {
    children,
    container,
    disablePortal = false
  } = props;
  const [mountNode, setMountNode] = reactExports.useState(null);
  const handleRef = useForkRef(/* @__PURE__ */ reactExports.isValidElement(children) ? children.ref : null, forwardedRef);
  useEnhancedEffect(() => {
    if (!disablePortal) {
      setMountNode(getContainer$2(container) || document.body);
    }
  }, [container, disablePortal]);
  useEnhancedEffect(() => {
    if (mountNode && !disablePortal) {
      setRef(forwardedRef, mountNode);
      return () => {
        setRef(forwardedRef, null);
      };
    }
    return void 0;
  }, [forwardedRef, mountNode, disablePortal]);
  if (disablePortal) {
    if (/* @__PURE__ */ reactExports.isValidElement(children)) {
      const newProps = {
        ref: handleRef
      };
      return /* @__PURE__ */ reactExports.cloneElement(children, newProps);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
      children
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: mountNode ? /* @__PURE__ */ reactDomExports.createPortal(children, mountNode) : mountNode
  });
});
function isOverflowing(container) {
  const doc = ownerDocument(container);
  if (doc.body === container) {
    return ownerWindow(container).innerWidth > doc.documentElement.clientWidth;
  }
  return container.scrollHeight > container.clientHeight;
}
function ariaHidden(element, show) {
  if (show) {
    element.setAttribute("aria-hidden", "true");
  } else {
    element.removeAttribute("aria-hidden");
  }
}
function getPaddingRight(element) {
  return parseInt(ownerWindow(element).getComputedStyle(element).paddingRight, 10) || 0;
}
function isAriaHiddenForbiddenOnElement(element) {
  const forbiddenTagNames = ["TEMPLATE", "SCRIPT", "STYLE", "LINK", "MAP", "META", "NOSCRIPT", "PICTURE", "COL", "COLGROUP", "PARAM", "SLOT", "SOURCE", "TRACK"];
  const isForbiddenTagName = forbiddenTagNames.indexOf(element.tagName) !== -1;
  const isInputHidden = element.tagName === "INPUT" && element.getAttribute("type") === "hidden";
  return isForbiddenTagName || isInputHidden;
}
function ariaHiddenSiblings(container, mountElement, currentElement, elementsToExclude, show) {
  const blacklist = [mountElement, currentElement, ...elementsToExclude];
  [].forEach.call(container.children, (element) => {
    const isNotExcludedElement = blacklist.indexOf(element) === -1;
    const isNotForbiddenElement = !isAriaHiddenForbiddenOnElement(element);
    if (isNotExcludedElement && isNotForbiddenElement) {
      ariaHidden(element, show);
    }
  });
}
function findIndexOf(items, callback) {
  let idx = -1;
  items.some((item, index) => {
    if (callback(item)) {
      idx = index;
      return true;
    }
    return false;
  });
  return idx;
}
function handleContainer(containerInfo, props) {
  const restoreStyle = [];
  const container = containerInfo.container;
  if (!props.disableScrollLock) {
    if (isOverflowing(container)) {
      const scrollbarSize = getScrollbarSize(ownerDocument(container));
      restoreStyle.push({
        value: container.style.paddingRight,
        property: "padding-right",
        el: container
      });
      container.style.paddingRight = `${getPaddingRight(container) + scrollbarSize}px`;
      const fixedElements2 = ownerDocument(container).querySelectorAll(".mui-fixed");
      [].forEach.call(fixedElements2, (element) => {
        restoreStyle.push({
          value: element.style.paddingRight,
          property: "padding-right",
          el: element
        });
        element.style.paddingRight = `${getPaddingRight(element) + scrollbarSize}px`;
      });
    }
    let scrollContainer;
    if (container.parentNode instanceof DocumentFragment) {
      scrollContainer = ownerDocument(container).body;
    } else {
      const parent = container.parentElement;
      const containerWindow = ownerWindow(container);
      scrollContainer = (parent == null ? void 0 : parent.nodeName) === "HTML" && containerWindow.getComputedStyle(parent).overflowY === "scroll" ? parent : container;
    }
    restoreStyle.push({
      value: scrollContainer.style.overflow,
      property: "overflow",
      el: scrollContainer
    }, {
      value: scrollContainer.style.overflowX,
      property: "overflow-x",
      el: scrollContainer
    }, {
      value: scrollContainer.style.overflowY,
      property: "overflow-y",
      el: scrollContainer
    });
    scrollContainer.style.overflow = "hidden";
  }
  const restore = () => {
    restoreStyle.forEach(({
      value,
      el,
      property
    }) => {
      if (value) {
        el.style.setProperty(property, value);
      } else {
        el.style.removeProperty(property);
      }
    });
  };
  return restore;
}
function getHiddenSiblings(container) {
  const hiddenSiblings = [];
  [].forEach.call(container.children, (element) => {
    if (element.getAttribute("aria-hidden") === "true") {
      hiddenSiblings.push(element);
    }
  });
  return hiddenSiblings;
}
class ModalManager {
  constructor() {
    this.containers = void 0;
    this.modals = void 0;
    this.modals = [];
    this.containers = [];
  }
  add(modal, container) {
    let modalIndex = this.modals.indexOf(modal);
    if (modalIndex !== -1) {
      return modalIndex;
    }
    modalIndex = this.modals.length;
    this.modals.push(modal);
    if (modal.modalRef) {
      ariaHidden(modal.modalRef, false);
    }
    const hiddenSiblings = getHiddenSiblings(container);
    ariaHiddenSiblings(container, modal.mount, modal.modalRef, hiddenSiblings, true);
    const containerIndex = findIndexOf(this.containers, (item) => item.container === container);
    if (containerIndex !== -1) {
      this.containers[containerIndex].modals.push(modal);
      return modalIndex;
    }
    this.containers.push({
      modals: [modal],
      container,
      restore: null,
      hiddenSiblings
    });
    return modalIndex;
  }
  mount(modal, props) {
    const containerIndex = findIndexOf(this.containers, (item) => item.modals.indexOf(modal) !== -1);
    const containerInfo = this.containers[containerIndex];
    if (!containerInfo.restore) {
      containerInfo.restore = handleContainer(containerInfo, props);
    }
  }
  remove(modal, ariaHiddenState = true) {
    const modalIndex = this.modals.indexOf(modal);
    if (modalIndex === -1) {
      return modalIndex;
    }
    const containerIndex = findIndexOf(this.containers, (item) => item.modals.indexOf(modal) !== -1);
    const containerInfo = this.containers[containerIndex];
    containerInfo.modals.splice(containerInfo.modals.indexOf(modal), 1);
    this.modals.splice(modalIndex, 1);
    if (containerInfo.modals.length === 0) {
      if (containerInfo.restore) {
        containerInfo.restore();
      }
      if (modal.modalRef) {
        ariaHidden(modal.modalRef, ariaHiddenState);
      }
      ariaHiddenSiblings(containerInfo.container, modal.mount, modal.modalRef, containerInfo.hiddenSiblings, false);
      this.containers.splice(containerIndex, 1);
    } else {
      const nextTop = containerInfo.modals[containerInfo.modals.length - 1];
      if (nextTop.modalRef) {
        ariaHidden(nextTop.modalRef, false);
      }
    }
    return modalIndex;
  }
  isTopModal(modal) {
    return this.modals.length > 0 && this.modals[this.modals.length - 1] === modal;
  }
}
function getContainer$1(container) {
  return typeof container === "function" ? container() : container;
}
function getHasTransition(children) {
  return children ? children.props.hasOwnProperty("in") : false;
}
const defaultManager = new ModalManager();
function useModal(parameters) {
  const {
    container,
    disableEscapeKeyDown = false,
    disableScrollLock = false,
    // @ts-ignore internal logic - Base UI supports the manager as a prop too
    manager = defaultManager,
    closeAfterTransition = false,
    onTransitionEnter,
    onTransitionExited,
    children,
    onClose,
    open,
    rootRef
  } = parameters;
  const modal = reactExports.useRef({});
  const mountNodeRef = reactExports.useRef(null);
  const modalRef = reactExports.useRef(null);
  const handleRef = useForkRef(modalRef, rootRef);
  const [exited, setExited] = reactExports.useState(!open);
  const hasTransition = getHasTransition(children);
  let ariaHiddenProp = true;
  if (parameters["aria-hidden"] === "false" || parameters["aria-hidden"] === false) {
    ariaHiddenProp = false;
  }
  const getDoc = () => ownerDocument(mountNodeRef.current);
  const getModal = () => {
    modal.current.modalRef = modalRef.current;
    modal.current.mount = mountNodeRef.current;
    return modal.current;
  };
  const handleMounted = () => {
    manager.mount(getModal(), {
      disableScrollLock
    });
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  };
  const handleOpen = useEventCallback(() => {
    const resolvedContainer = getContainer$1(container) || getDoc().body;
    manager.add(getModal(), resolvedContainer);
    if (modalRef.current) {
      handleMounted();
    }
  });
  const isTopModal = reactExports.useCallback(() => manager.isTopModal(getModal()), [manager]);
  const handlePortalRef = useEventCallback((node) => {
    mountNodeRef.current = node;
    if (!node) {
      return;
    }
    if (open && isTopModal()) {
      handleMounted();
    } else if (modalRef.current) {
      ariaHidden(modalRef.current, ariaHiddenProp);
    }
  });
  const handleClose = reactExports.useCallback(() => {
    manager.remove(getModal(), ariaHiddenProp);
  }, [ariaHiddenProp, manager]);
  reactExports.useEffect(() => {
    return () => {
      handleClose();
    };
  }, [handleClose]);
  reactExports.useEffect(() => {
    if (open) {
      handleOpen();
    } else if (!hasTransition || !closeAfterTransition) {
      handleClose();
    }
  }, [open, handleClose, hasTransition, closeAfterTransition, handleOpen]);
  const createHandleKeyDown = (otherHandlers) => (event) => {
    var _otherHandlers$onKeyD;
    (_otherHandlers$onKeyD = otherHandlers.onKeyDown) == null || _otherHandlers$onKeyD.call(otherHandlers, event);
    if (event.key !== "Escape" || event.which === 229 || // Wait until IME is settled.
    !isTopModal()) {
      return;
    }
    if (!disableEscapeKeyDown) {
      event.stopPropagation();
      if (onClose) {
        onClose(event, "escapeKeyDown");
      }
    }
  };
  const createHandleBackdropClick = (otherHandlers) => (event) => {
    var _otherHandlers$onClic;
    (_otherHandlers$onClic = otherHandlers.onClick) == null || _otherHandlers$onClic.call(otherHandlers, event);
    if (event.target !== event.currentTarget) {
      return;
    }
    if (onClose) {
      onClose(event, "backdropClick");
    }
  };
  const getRootProps = (otherHandlers = {}) => {
    const propsEventHandlers = extractEventHandlers(parameters);
    delete propsEventHandlers.onTransitionEnter;
    delete propsEventHandlers.onTransitionExited;
    const externalEventHandlers = _extends({}, propsEventHandlers, otherHandlers);
    return _extends({
      role: "presentation"
    }, externalEventHandlers, {
      onKeyDown: createHandleKeyDown(externalEventHandlers),
      ref: handleRef
    });
  };
  const getBackdropProps = (otherHandlers = {}) => {
    const externalEventHandlers = otherHandlers;
    return _extends({
      "aria-hidden": true
    }, externalEventHandlers, {
      onClick: createHandleBackdropClick(externalEventHandlers),
      open
    });
  };
  const getTransitionProps2 = () => {
    const handleEnter = () => {
      setExited(false);
      if (onTransitionEnter) {
        onTransitionEnter();
      }
    };
    const handleExited = () => {
      setExited(true);
      if (onTransitionExited) {
        onTransitionExited();
      }
      if (closeAfterTransition) {
        handleClose();
      }
    };
    return {
      onEnter: createChainedFunction(handleEnter, children == null ? void 0 : children.props.onEnter),
      onExited: createChainedFunction(handleExited, children == null ? void 0 : children.props.onExited)
    };
  };
  return {
    getRootProps,
    getBackdropProps,
    getTransitionProps: getTransitionProps2,
    rootRef: handleRef,
    portalRef: handlePortalRef,
    isTopModal,
    exited,
    hasTransition
  };
}
const COMPONENT_NAME$1 = "Popper";
function getPopperUtilityClass$1(slot) {
  return generateUtilityClass$1(COMPONENT_NAME$1, slot);
}
const _excluded$1E = ["anchorEl", "children", "direction", "disablePortal", "modifiers", "open", "placement", "popperOptions", "popperRef", "slotProps", "slots", "TransitionProps", "ownerState"], _excluded2$b = ["anchorEl", "children", "container", "direction", "disablePortal", "keepMounted", "modifiers", "open", "placement", "popperOptions", "popperRef", "style", "transition", "slotProps", "slots"];
function flipPlacement$1(placement, direction) {
  if (direction === "ltr") {
    return placement;
  }
  switch (placement) {
    case "bottom-end":
      return "bottom-start";
    case "bottom-start":
      return "bottom-end";
    case "top-end":
      return "top-start";
    case "top-start":
      return "top-end";
    default:
      return placement;
  }
}
function resolveAnchorEl$2(anchorEl) {
  return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}
function isHTMLElement$1(element) {
  return element.nodeType !== void 0;
}
const useUtilityClasses$1t = () => {
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, useClassNamesOverride(getPopperUtilityClass$1));
};
const defaultPopperOptions$1 = {};
const PopperTooltip$1 = /* @__PURE__ */ reactExports.forwardRef(function PopperTooltip2(props, forwardedRef) {
  var _slots$root;
  const {
    anchorEl,
    children,
    direction,
    disablePortal,
    modifiers,
    open,
    placement: initialPlacement,
    popperOptions,
    popperRef: popperRefProp,
    slotProps = {},
    slots = {},
    TransitionProps
    // @ts-ignore internal logic
    // prevent from spreading to DOM, it can come from the parent component e.g. Select.
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1E);
  const tooltipRef = reactExports.useRef(null);
  const ownRef = useForkRef(tooltipRef, forwardedRef);
  const popperRef = reactExports.useRef(null);
  const handlePopperRef = useForkRef(popperRef, popperRefProp);
  const handlePopperRefRef = reactExports.useRef(handlePopperRef);
  useEnhancedEffect(() => {
    handlePopperRefRef.current = handlePopperRef;
  }, [handlePopperRef]);
  reactExports.useImperativeHandle(popperRefProp, () => popperRef.current, []);
  const rtlPlacement = flipPlacement$1(initialPlacement, direction);
  const [placement, setPlacement] = reactExports.useState(rtlPlacement);
  const [resolvedAnchorElement, setResolvedAnchorElement] = reactExports.useState(resolveAnchorEl$2(anchorEl));
  reactExports.useEffect(() => {
    if (popperRef.current) {
      popperRef.current.forceUpdate();
    }
  });
  reactExports.useEffect(() => {
    if (anchorEl) {
      setResolvedAnchorElement(resolveAnchorEl$2(anchorEl));
    }
  }, [anchorEl]);
  useEnhancedEffect(() => {
    if (!resolvedAnchorElement || !open) {
      return void 0;
    }
    const handlePopperUpdate = (data) => {
      setPlacement(data.placement);
    };
    let popperModifiers = [{
      name: "preventOverflow",
      options: {
        altBoundary: disablePortal
      }
    }, {
      name: "flip",
      options: {
        altBoundary: disablePortal
      }
    }, {
      name: "onUpdate",
      enabled: true,
      phase: "afterWrite",
      fn: ({
        state
      }) => {
        handlePopperUpdate(state);
      }
    }];
    if (modifiers != null) {
      popperModifiers = popperModifiers.concat(modifiers);
    }
    if (popperOptions && popperOptions.modifiers != null) {
      popperModifiers = popperModifiers.concat(popperOptions.modifiers);
    }
    const popper = createPopper(resolvedAnchorElement, tooltipRef.current, _extends({
      placement: rtlPlacement
    }, popperOptions, {
      modifiers: popperModifiers
    }));
    handlePopperRefRef.current(popper);
    return () => {
      popper.destroy();
      handlePopperRefRef.current(null);
    };
  }, [resolvedAnchorElement, disablePortal, modifiers, open, popperOptions, rtlPlacement]);
  const childProps = {
    placement
  };
  if (TransitionProps !== null) {
    childProps.TransitionProps = TransitionProps;
  }
  const classes = useUtilityClasses$1t();
  const Root = (_slots$root = slots.root) != null ? _slots$root : "div";
  const rootProps = useSlotProps({
    elementType: Root,
    externalSlotProps: slotProps.root,
    externalForwardedProps: other,
    additionalProps: {
      role: "tooltip",
      ref: ownRef
    },
    ownerState: props,
    className: classes.root
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, _extends({}, rootProps, {
    children: typeof children === "function" ? children(childProps) : children
  }));
});
const Popper$2 = /* @__PURE__ */ reactExports.forwardRef(function Popper2(props, forwardedRef) {
  const {
    anchorEl,
    children,
    container: containerProp,
    direction = "ltr",
    disablePortal = false,
    keepMounted = false,
    modifiers,
    open,
    placement = "bottom",
    popperOptions = defaultPopperOptions$1,
    popperRef,
    style: style2,
    transition = false,
    slotProps = {},
    slots = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded2$b);
  const [exited, setExited] = reactExports.useState(true);
  const handleEnter = () => {
    setExited(false);
  };
  const handleExited = () => {
    setExited(true);
  };
  if (!keepMounted && !open && (!transition || exited)) {
    return null;
  }
  let container;
  if (containerProp) {
    container = containerProp;
  } else if (anchorEl) {
    const resolvedAnchorEl = resolveAnchorEl$2(anchorEl);
    container = resolvedAnchorEl && isHTMLElement$1(resolvedAnchorEl) ? ownerDocument(resolvedAnchorEl).body : ownerDocument(null).body;
  }
  const display = !open && keepMounted && (!transition || exited) ? "none" : void 0;
  const transitionProps = transition ? {
    in: open,
    onEnter: handleEnter,
    onExited: handleExited
  } : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, {
    disablePortal,
    container,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(PopperTooltip$1, _extends({
      anchorEl,
      direction,
      disablePortal,
      modifiers,
      ref: forwardedRef,
      open: transition ? !exited : open,
      placement,
      popperOptions,
      popperRef,
      slotProps,
      slots
    }, other, {
      style: _extends({
        // Prevents scroll issue, waiting for Popper.js to add this style once initiated.
        position: "fixed",
        // Fix Popper.js display issue
        top: 0,
        left: 0,
        display
      }, style2),
      TransitionProps: transitionProps,
      children
    }))
  });
});
const INTENTIONAL_DRAG_COUNT_THRESHOLD = 2;
function asc(a, b2) {
  return a - b2;
}
function findClosest(values2, currentValue) {
  var _values$reduce;
  const {
    index: closestIndex
  } = (_values$reduce = values2.reduce((acc, value, index) => {
    const distance = Math.abs(currentValue - value);
    if (acc === null || distance < acc.distance || distance === acc.distance) {
      return {
        distance,
        index
      };
    }
    return acc;
  }, null)) != null ? _values$reduce : {};
  return closestIndex;
}
function trackFinger(event, touchId) {
  if (touchId.current !== void 0 && event.changedTouches) {
    const touchEvent = event;
    for (let i = 0; i < touchEvent.changedTouches.length; i += 1) {
      const touch = touchEvent.changedTouches[i];
      if (touch.identifier === touchId.current) {
        return {
          x: touch.clientX,
          y: touch.clientY
        };
      }
    }
    return false;
  }
  return {
    x: event.clientX,
    y: event.clientY
  };
}
function valueToPercent(value, min, max) {
  return (value - min) * 100 / (max - min);
}
function percentToValue(percent, min, max) {
  return (max - min) * percent + min;
}
function getDecimalPrecision$1(num) {
  if (Math.abs(num) < 1) {
    const parts = num.toExponential().split("e-");
    const matissaDecimalPart = parts[0].split(".")[1];
    return (matissaDecimalPart ? matissaDecimalPart.length : 0) + parseInt(parts[1], 10);
  }
  const decimalPart = num.toString().split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}
function roundValueToStep(value, step, min) {
  const nearest = Math.round((value - min) / step) * step + min;
  return Number(nearest.toFixed(getDecimalPrecision$1(step)));
}
function setValueIndex({
  values: values2,
  newValue,
  index
}) {
  const output = values2.slice();
  output[index] = newValue;
  return output.sort(asc);
}
function focusThumb({
  sliderRef,
  activeIndex,
  setActive
}) {
  var _sliderRef$current, _doc$activeElement;
  const doc = ownerDocument(sliderRef.current);
  if (!((_sliderRef$current = sliderRef.current) != null && _sliderRef$current.contains(doc.activeElement)) || Number(doc == null || (_doc$activeElement = doc.activeElement) == null ? void 0 : _doc$activeElement.getAttribute("data-index")) !== activeIndex) {
    var _sliderRef$current2;
    (_sliderRef$current2 = sliderRef.current) == null || _sliderRef$current2.querySelector(`[type="range"][data-index="${activeIndex}"]`).focus();
  }
  if (setActive) {
    setActive(activeIndex);
  }
}
function areValuesEqual(newValue, oldValue) {
  if (typeof newValue === "number" && typeof oldValue === "number") {
    return newValue === oldValue;
  }
  if (typeof newValue === "object" && typeof oldValue === "object") {
    return areArraysEqual(newValue, oldValue);
  }
  return false;
}
const axisProps = {
  horizontal: {
    offset: (percent) => ({
      left: `${percent}%`
    }),
    leap: (percent) => ({
      width: `${percent}%`
    })
  },
  "horizontal-reverse": {
    offset: (percent) => ({
      right: `${percent}%`
    }),
    leap: (percent) => ({
      width: `${percent}%`
    })
  },
  vertical: {
    offset: (percent) => ({
      bottom: `${percent}%`
    }),
    leap: (percent) => ({
      height: `${percent}%`
    })
  }
};
const Identity$1 = (x) => x;
let cachedSupportsTouchActionNone;
function doesSupportTouchActionNone() {
  if (cachedSupportsTouchActionNone === void 0) {
    if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
      cachedSupportsTouchActionNone = CSS.supports("touch-action", "none");
    } else {
      cachedSupportsTouchActionNone = true;
    }
  }
  return cachedSupportsTouchActionNone;
}
function useSlider(parameters) {
  const {
    "aria-labelledby": ariaLabelledby,
    defaultValue,
    disabled = false,
    disableSwap = false,
    isRtl = false,
    marks: marksProp = false,
    max = 100,
    min = 0,
    name,
    onChange,
    onChangeCommitted,
    orientation = "horizontal",
    rootRef: ref,
    scale = Identity$1,
    step = 1,
    shiftStep = 10,
    tabIndex,
    value: valueProp
  } = parameters;
  const touchId = reactExports.useRef();
  const [active, setActive] = reactExports.useState(-1);
  const [open, setOpen] = reactExports.useState(-1);
  const [dragging, setDragging] = reactExports.useState(false);
  const moveCount = reactExports.useRef(0);
  const [valueDerived, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue != null ? defaultValue : min,
    name: "Slider"
  });
  const handleChange = onChange && ((event, value, thumbIndex) => {
    const nativeEvent = event.nativeEvent || event;
    const clonedEvent = new nativeEvent.constructor(nativeEvent.type, nativeEvent);
    Object.defineProperty(clonedEvent, "target", {
      writable: true,
      value: {
        value,
        name
      }
    });
    onChange(clonedEvent, value, thumbIndex);
  });
  const range = Array.isArray(valueDerived);
  let values2 = range ? valueDerived.slice().sort(asc) : [valueDerived];
  values2 = values2.map((value) => value == null ? min : clamp$1(value, min, max));
  const marks = marksProp === true && step !== null ? [...Array(Math.floor((max - min) / step) + 1)].map((_2, index) => ({
    value: min + step * index
  })) : marksProp || [];
  const marksValues = marks.map((mark) => mark.value);
  const {
    isFocusVisibleRef,
    onBlur: handleBlurVisible,
    onFocus: handleFocusVisible,
    ref: focusVisibleRef
  } = useIsFocusVisible();
  const [focusedThumbIndex, setFocusedThumbIndex] = reactExports.useState(-1);
  const sliderRef = reactExports.useRef();
  const handleFocusRef = useForkRef(focusVisibleRef, sliderRef);
  const handleRef = useForkRef(ref, handleFocusRef);
  const createHandleHiddenInputFocus = (otherHandlers) => (event) => {
    var _otherHandlers$onFocu;
    const index = Number(event.currentTarget.getAttribute("data-index"));
    handleFocusVisible(event);
    if (isFocusVisibleRef.current === true) {
      setFocusedThumbIndex(index);
    }
    setOpen(index);
    otherHandlers == null || (_otherHandlers$onFocu = otherHandlers.onFocus) == null || _otherHandlers$onFocu.call(otherHandlers, event);
  };
  const createHandleHiddenInputBlur = (otherHandlers) => (event) => {
    var _otherHandlers$onBlur;
    handleBlurVisible(event);
    if (isFocusVisibleRef.current === false) {
      setFocusedThumbIndex(-1);
    }
    setOpen(-1);
    otherHandlers == null || (_otherHandlers$onBlur = otherHandlers.onBlur) == null || _otherHandlers$onBlur.call(otherHandlers, event);
  };
  const changeValue = (event, valueInput) => {
    const index = Number(event.currentTarget.getAttribute("data-index"));
    const value = values2[index];
    const marksIndex = marksValues.indexOf(value);
    let newValue = valueInput;
    if (marks && step == null) {
      const maxMarksValue = marksValues[marksValues.length - 1];
      if (newValue > maxMarksValue) {
        newValue = maxMarksValue;
      } else if (newValue < marksValues[0]) {
        newValue = marksValues[0];
      } else {
        newValue = newValue < value ? marksValues[marksIndex - 1] : marksValues[marksIndex + 1];
      }
    }
    newValue = clamp$1(newValue, min, max);
    if (range) {
      if (disableSwap) {
        newValue = clamp$1(newValue, values2[index - 1] || -Infinity, values2[index + 1] || Infinity);
      }
      const previousValue = newValue;
      newValue = setValueIndex({
        values: values2,
        newValue,
        index
      });
      let activeIndex = index;
      if (!disableSwap) {
        activeIndex = newValue.indexOf(previousValue);
      }
      focusThumb({
        sliderRef,
        activeIndex
      });
    }
    setValueState(newValue);
    setFocusedThumbIndex(index);
    if (handleChange && !areValuesEqual(newValue, valueDerived)) {
      handleChange(event, newValue, index);
    }
    if (onChangeCommitted) {
      onChangeCommitted(event, newValue);
    }
  };
  const createHandleHiddenInputKeyDown = (otherHandlers) => (event) => {
    var _otherHandlers$onKeyD;
    if (step !== null) {
      const index = Number(event.currentTarget.getAttribute("data-index"));
      const value = values2[index];
      let newValue = null;
      if ((event.key === "ArrowLeft" || event.key === "ArrowDown") && event.shiftKey || event.key === "PageDown") {
        newValue = Math.max(value - shiftStep, min);
      } else if ((event.key === "ArrowRight" || event.key === "ArrowUp") && event.shiftKey || event.key === "PageUp") {
        newValue = Math.min(value + shiftStep, max);
      }
      if (newValue !== null) {
        changeValue(event, newValue);
        event.preventDefault();
      }
    }
    otherHandlers == null || (_otherHandlers$onKeyD = otherHandlers.onKeyDown) == null || _otherHandlers$onKeyD.call(otherHandlers, event);
  };
  useEnhancedEffect(() => {
    if (disabled && sliderRef.current.contains(document.activeElement)) {
      var _document$activeEleme;
      (_document$activeEleme = document.activeElement) == null || _document$activeEleme.blur();
    }
  }, [disabled]);
  if (disabled && active !== -1) {
    setActive(-1);
  }
  if (disabled && focusedThumbIndex !== -1) {
    setFocusedThumbIndex(-1);
  }
  const createHandleHiddenInputChange = (otherHandlers) => (event) => {
    var _otherHandlers$onChan;
    (_otherHandlers$onChan = otherHandlers.onChange) == null || _otherHandlers$onChan.call(otherHandlers, event);
    changeValue(event, event.target.valueAsNumber);
  };
  const previousIndex = reactExports.useRef();
  let axis = orientation;
  if (isRtl && orientation === "horizontal") {
    axis += "-reverse";
  }
  const getFingerNewValue = ({
    finger,
    move = false
  }) => {
    const {
      current: slider
    } = sliderRef;
    const {
      width: width2,
      height: height2,
      bottom,
      left
    } = slider.getBoundingClientRect();
    let percent;
    if (axis.indexOf("vertical") === 0) {
      percent = (bottom - finger.y) / height2;
    } else {
      percent = (finger.x - left) / width2;
    }
    if (axis.indexOf("-reverse") !== -1) {
      percent = 1 - percent;
    }
    let newValue;
    newValue = percentToValue(percent, min, max);
    if (step) {
      newValue = roundValueToStep(newValue, step, min);
    } else {
      const closestIndex = findClosest(marksValues, newValue);
      newValue = marksValues[closestIndex];
    }
    newValue = clamp$1(newValue, min, max);
    let activeIndex = 0;
    if (range) {
      if (!move) {
        activeIndex = findClosest(values2, newValue);
      } else {
        activeIndex = previousIndex.current;
      }
      if (disableSwap) {
        newValue = clamp$1(newValue, values2[activeIndex - 1] || -Infinity, values2[activeIndex + 1] || Infinity);
      }
      const previousValue = newValue;
      newValue = setValueIndex({
        values: values2,
        newValue,
        index: activeIndex
      });
      if (!(disableSwap && move)) {
        activeIndex = newValue.indexOf(previousValue);
        previousIndex.current = activeIndex;
      }
    }
    return {
      newValue,
      activeIndex
    };
  };
  const handleTouchMove = useEventCallback((nativeEvent) => {
    const finger = trackFinger(nativeEvent, touchId);
    if (!finger) {
      return;
    }
    moveCount.current += 1;
    if (nativeEvent.type === "mousemove" && nativeEvent.buttons === 0) {
      handleTouchEnd(nativeEvent);
      return;
    }
    const {
      newValue,
      activeIndex
    } = getFingerNewValue({
      finger,
      move: true
    });
    focusThumb({
      sliderRef,
      activeIndex,
      setActive
    });
    setValueState(newValue);
    if (!dragging && moveCount.current > INTENTIONAL_DRAG_COUNT_THRESHOLD) {
      setDragging(true);
    }
    if (handleChange && !areValuesEqual(newValue, valueDerived)) {
      handleChange(nativeEvent, newValue, activeIndex);
    }
  });
  const handleTouchEnd = useEventCallback((nativeEvent) => {
    const finger = trackFinger(nativeEvent, touchId);
    setDragging(false);
    if (!finger) {
      return;
    }
    const {
      newValue
    } = getFingerNewValue({
      finger,
      move: true
    });
    setActive(-1);
    if (nativeEvent.type === "touchend") {
      setOpen(-1);
    }
    if (onChangeCommitted) {
      onChangeCommitted(nativeEvent, newValue);
    }
    touchId.current = void 0;
    stopListening();
  });
  const handleTouchStart = useEventCallback((nativeEvent) => {
    if (disabled) {
      return;
    }
    if (!doesSupportTouchActionNone()) {
      nativeEvent.preventDefault();
    }
    const touch = nativeEvent.changedTouches[0];
    if (touch != null) {
      touchId.current = touch.identifier;
    }
    const finger = trackFinger(nativeEvent, touchId);
    if (finger !== false) {
      const {
        newValue,
        activeIndex
      } = getFingerNewValue({
        finger
      });
      focusThumb({
        sliderRef,
        activeIndex,
        setActive
      });
      setValueState(newValue);
      if (handleChange && !areValuesEqual(newValue, valueDerived)) {
        handleChange(nativeEvent, newValue, activeIndex);
      }
    }
    moveCount.current = 0;
    const doc = ownerDocument(sliderRef.current);
    doc.addEventListener("touchmove", handleTouchMove, {
      passive: true
    });
    doc.addEventListener("touchend", handleTouchEnd, {
      passive: true
    });
  });
  const stopListening = reactExports.useCallback(() => {
    const doc = ownerDocument(sliderRef.current);
    doc.removeEventListener("mousemove", handleTouchMove);
    doc.removeEventListener("mouseup", handleTouchEnd);
    doc.removeEventListener("touchmove", handleTouchMove);
    doc.removeEventListener("touchend", handleTouchEnd);
  }, [handleTouchEnd, handleTouchMove]);
  reactExports.useEffect(() => {
    const {
      current: slider
    } = sliderRef;
    slider.addEventListener("touchstart", handleTouchStart, {
      passive: doesSupportTouchActionNone()
    });
    return () => {
      slider.removeEventListener("touchstart", handleTouchStart);
      stopListening();
    };
  }, [stopListening, handleTouchStart]);
  reactExports.useEffect(() => {
    if (disabled) {
      stopListening();
    }
  }, [disabled, stopListening]);
  const createHandleMouseDown = (otherHandlers) => (event) => {
    var _otherHandlers$onMous;
    (_otherHandlers$onMous = otherHandlers.onMouseDown) == null || _otherHandlers$onMous.call(otherHandlers, event);
    if (disabled) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const finger = trackFinger(event, touchId);
    if (finger !== false) {
      const {
        newValue,
        activeIndex
      } = getFingerNewValue({
        finger
      });
      focusThumb({
        sliderRef,
        activeIndex,
        setActive
      });
      setValueState(newValue);
      if (handleChange && !areValuesEqual(newValue, valueDerived)) {
        handleChange(event, newValue, activeIndex);
      }
    }
    moveCount.current = 0;
    const doc = ownerDocument(sliderRef.current);
    doc.addEventListener("mousemove", handleTouchMove, {
      passive: true
    });
    doc.addEventListener("mouseup", handleTouchEnd);
  };
  const trackOffset = valueToPercent(range ? values2[0] : min, min, max);
  const trackLeap = valueToPercent(values2[values2.length - 1], min, max) - trackOffset;
  const getRootProps = (externalProps = {}) => {
    const externalHandlers = extractEventHandlers(externalProps);
    const ownEventHandlers = {
      onMouseDown: createHandleMouseDown(externalHandlers || {})
    };
    const mergedEventHandlers = _extends({}, externalHandlers, ownEventHandlers);
    return _extends({}, externalProps, {
      ref: handleRef
    }, mergedEventHandlers);
  };
  const createHandleMouseOver = (otherHandlers) => (event) => {
    var _otherHandlers$onMous2;
    (_otherHandlers$onMous2 = otherHandlers.onMouseOver) == null || _otherHandlers$onMous2.call(otherHandlers, event);
    const index = Number(event.currentTarget.getAttribute("data-index"));
    setOpen(index);
  };
  const createHandleMouseLeave = (otherHandlers) => (event) => {
    var _otherHandlers$onMous3;
    (_otherHandlers$onMous3 = otherHandlers.onMouseLeave) == null || _otherHandlers$onMous3.call(otherHandlers, event);
    setOpen(-1);
  };
  const getThumbProps = (externalProps = {}) => {
    const externalHandlers = extractEventHandlers(externalProps);
    const ownEventHandlers = {
      onMouseOver: createHandleMouseOver(externalHandlers || {}),
      onMouseLeave: createHandleMouseLeave(externalHandlers || {})
    };
    return _extends({}, externalProps, externalHandlers, ownEventHandlers);
  };
  const getThumbStyle = (index) => {
    return {
      // So the non active thumb doesn't show its label on hover.
      pointerEvents: active !== -1 && active !== index ? "none" : void 0
    };
  };
  const getHiddenInputProps = (externalProps = {}) => {
    var _parameters$step;
    const externalHandlers = extractEventHandlers(externalProps);
    const ownEventHandlers = {
      onChange: createHandleHiddenInputChange(externalHandlers || {}),
      onFocus: createHandleHiddenInputFocus(externalHandlers || {}),
      onBlur: createHandleHiddenInputBlur(externalHandlers || {}),
      onKeyDown: createHandleHiddenInputKeyDown(externalHandlers || {})
    };
    const mergedEventHandlers = _extends({}, externalHandlers, ownEventHandlers);
    return _extends({
      tabIndex,
      "aria-labelledby": ariaLabelledby,
      "aria-orientation": orientation,
      "aria-valuemax": scale(max),
      "aria-valuemin": scale(min),
      name,
      type: "range",
      min: parameters.min,
      max: parameters.max,
      step: parameters.step === null && parameters.marks ? "any" : (_parameters$step = parameters.step) != null ? _parameters$step : void 0,
      disabled
    }, externalProps, mergedEventHandlers, {
      style: _extends({}, visuallyHidden, {
        direction: isRtl ? "rtl" : "ltr",
        // So that VoiceOver's focus indicator matches the thumb's dimensions
        width: "100%",
        height: "100%"
      })
    });
  };
  return {
    active,
    axis,
    axisProps,
    dragging,
    focusedThumbIndex,
    getHiddenInputProps,
    getRootProps,
    getThumbProps,
    marks,
    open,
    range,
    rootRef: handleRef,
    trackLeap,
    trackOffset,
    values: values2,
    getThumbStyle
  };
}
function useSnackbar(parameters = {}) {
  const {
    autoHideDuration = null,
    disableWindowBlurListener = false,
    onClose,
    open,
    resumeHideDuration
  } = parameters;
  const timerAutoHide = useTimeout();
  reactExports.useEffect(() => {
    if (!open) {
      return void 0;
    }
    function handleKeyDown2(nativeEvent) {
      if (!nativeEvent.defaultPrevented) {
        if (nativeEvent.key === "Escape" || nativeEvent.key === "Esc") {
          onClose == null || onClose(nativeEvent, "escapeKeyDown");
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("keydown", handleKeyDown2);
    };
  }, [open, onClose]);
  const handleClose = useEventCallback((event, reason) => {
    onClose == null || onClose(event, reason);
  });
  const setAutoHideTimer = useEventCallback((autoHideDurationParam) => {
    if (!onClose || autoHideDurationParam == null) {
      return;
    }
    timerAutoHide.start(autoHideDurationParam, () => {
      handleClose(null, "timeout");
    });
  });
  reactExports.useEffect(() => {
    if (open) {
      setAutoHideTimer(autoHideDuration);
    }
    return timerAutoHide.clear;
  }, [open, autoHideDuration, setAutoHideTimer, timerAutoHide]);
  const handleClickAway = (event) => {
    onClose == null || onClose(event, "clickaway");
  };
  const handlePause = timerAutoHide.clear;
  const handleResume = reactExports.useCallback(() => {
    if (autoHideDuration != null) {
      setAutoHideTimer(resumeHideDuration != null ? resumeHideDuration : autoHideDuration * 0.5);
    }
  }, [autoHideDuration, resumeHideDuration, setAutoHideTimer]);
  const createHandleBlur = (otherHandlers) => (event) => {
    const onBlurCallback = otherHandlers.onBlur;
    onBlurCallback == null || onBlurCallback(event);
    handleResume();
  };
  const createHandleFocus = (otherHandlers) => (event) => {
    const onFocusCallback = otherHandlers.onFocus;
    onFocusCallback == null || onFocusCallback(event);
    handlePause();
  };
  const createMouseEnter = (otherHandlers) => (event) => {
    const onMouseEnterCallback = otherHandlers.onMouseEnter;
    onMouseEnterCallback == null || onMouseEnterCallback(event);
    handlePause();
  };
  const createMouseLeave = (otherHandlers) => (event) => {
    const onMouseLeaveCallback = otherHandlers.onMouseLeave;
    onMouseLeaveCallback == null || onMouseLeaveCallback(event);
    handleResume();
  };
  reactExports.useEffect(() => {
    if (!disableWindowBlurListener && open) {
      window.addEventListener("focus", handleResume);
      window.addEventListener("blur", handlePause);
      return () => {
        window.removeEventListener("focus", handleResume);
        window.removeEventListener("blur", handlePause);
      };
    }
    return void 0;
  }, [disableWindowBlurListener, open, handleResume, handlePause]);
  const getRootProps = (externalProps = {}) => {
    const externalEventHandlers = _extends({}, extractEventHandlers(parameters), extractEventHandlers(externalProps));
    return _extends({
      // ClickAwayListener adds an `onClick` prop which results in the alert not being announced.
      // See https://github.com/mui/material-ui/issues/29080
      role: "presentation"
    }, externalProps, externalEventHandlers, {
      onBlur: createHandleBlur(externalEventHandlers),
      onFocus: createHandleFocus(externalEventHandlers),
      onMouseEnter: createMouseEnter(externalEventHandlers),
      onMouseLeave: createMouseLeave(externalEventHandlers)
    });
  };
  return {
    getRootProps,
    onClickAway: handleClickAway
  };
}
const _excluded$1D = ["onChange", "maxRows", "minRows", "style", "value"];
function getStyleValue(value) {
  return parseInt(value, 10) || 0;
}
const styles$5 = {
  shadow: {
    // Visibility needed to hide the extra text area on iPads
    visibility: "hidden",
    // Remove from the content flow
    position: "absolute",
    // Ignore the scrollbar width
    overflow: "hidden",
    height: 0,
    top: 0,
    left: 0,
    // Create a new layer, increase the isolation of the computed values
    transform: "translateZ(0)"
  }
};
function isEmpty$1(obj) {
  return obj === void 0 || obj === null || Object.keys(obj).length === 0 || obj.outerHeightStyle === 0 && !obj.overflowing;
}
const TextareaAutosize = /* @__PURE__ */ reactExports.forwardRef(function TextareaAutosize2(props, forwardedRef) {
  const {
    onChange,
    maxRows,
    minRows = 1,
    style: style2,
    value
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1D);
  const {
    current: isControlled
  } = reactExports.useRef(value != null);
  const inputRef = reactExports.useRef(null);
  const handleRef = useForkRef(forwardedRef, inputRef);
  const shadowRef = reactExports.useRef(null);
  const calculateTextareaStyles = reactExports.useCallback(() => {
    const input = inputRef.current;
    const containerWindow = ownerWindow(input);
    const computedStyle = containerWindow.getComputedStyle(input);
    if (computedStyle.width === "0px") {
      return {
        outerHeightStyle: 0,
        overflowing: false
      };
    }
    const inputShallow = shadowRef.current;
    inputShallow.style.width = computedStyle.width;
    inputShallow.value = input.value || props.placeholder || "x";
    if (inputShallow.value.slice(-1) === "\n") {
      inputShallow.value += " ";
    }
    const boxSizing2 = computedStyle.boxSizing;
    const padding2 = getStyleValue(computedStyle.paddingBottom) + getStyleValue(computedStyle.paddingTop);
    const border2 = getStyleValue(computedStyle.borderBottomWidth) + getStyleValue(computedStyle.borderTopWidth);
    const innerHeight = inputShallow.scrollHeight;
    inputShallow.value = "x";
    const singleRowHeight = inputShallow.scrollHeight;
    let outerHeight = innerHeight;
    if (minRows) {
      outerHeight = Math.max(Number(minRows) * singleRowHeight, outerHeight);
    }
    if (maxRows) {
      outerHeight = Math.min(Number(maxRows) * singleRowHeight, outerHeight);
    }
    outerHeight = Math.max(outerHeight, singleRowHeight);
    const outerHeightStyle = outerHeight + (boxSizing2 === "border-box" ? padding2 + border2 : 0);
    const overflowing = Math.abs(outerHeight - innerHeight) <= 1;
    return {
      outerHeightStyle,
      overflowing
    };
  }, [maxRows, minRows, props.placeholder]);
  const syncHeight = reactExports.useCallback(() => {
    const textareaStyles = calculateTextareaStyles();
    if (isEmpty$1(textareaStyles)) {
      return;
    }
    const input = inputRef.current;
    input.style.height = `${textareaStyles.outerHeightStyle}px`;
    input.style.overflow = textareaStyles.overflowing ? "hidden" : "";
  }, [calculateTextareaStyles]);
  useEnhancedEffect(() => {
    const handleResize = () => {
      syncHeight();
    };
    let rAF;
    const debounceHandleResize = debounce(handleResize);
    const input = inputRef.current;
    const containerWindow = ownerWindow(input);
    containerWindow.addEventListener("resize", debounceHandleResize);
    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(input);
    }
    return () => {
      debounceHandleResize.clear();
      cancelAnimationFrame(rAF);
      containerWindow.removeEventListener("resize", debounceHandleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [calculateTextareaStyles, syncHeight]);
  useEnhancedEffect(() => {
    syncHeight();
  });
  const handleChange = (event) => {
    if (!isControlled) {
      syncHeight();
    }
    if (onChange) {
      onChange(event);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("textarea", _extends({
      value,
      onChange: handleChange,
      ref: handleRef,
      rows: minRows,
      style: style2
    }, other)), /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", {
      "aria-hidden": true,
      className: props.className,
      readOnly: true,
      ref: shadowRef,
      tabIndex: -1,
      style: _extends({}, styles$5.shadow, style2, {
        paddingTop: 0,
        paddingBottom: 0
      })
    })]
  });
});
function stripDiacritics(string) {
  return typeof string.normalize !== "undefined" ? string.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : string;
}
function createFilterOptions(config = {}) {
  const {
    ignoreAccents = true,
    ignoreCase = true,
    limit,
    matchFrom = "any",
    stringify: stringify2,
    trim = false
  } = config;
  return (options, {
    inputValue,
    getOptionLabel
  }) => {
    let input = trim ? inputValue.trim() : inputValue;
    if (ignoreCase) {
      input = input.toLowerCase();
    }
    if (ignoreAccents) {
      input = stripDiacritics(input);
    }
    const filteredOptions = !input ? options : options.filter((option) => {
      let candidate = (stringify2 || getOptionLabel)(option);
      if (ignoreCase) {
        candidate = candidate.toLowerCase();
      }
      if (ignoreAccents) {
        candidate = stripDiacritics(candidate);
      }
      return matchFrom === "start" ? candidate.indexOf(input) === 0 : candidate.indexOf(input) > -1;
    });
    return typeof limit === "number" ? filteredOptions.slice(0, limit) : filteredOptions;
  };
}
function findIndex(array, comp) {
  for (let i = 0; i < array.length; i += 1) {
    if (comp(array[i])) {
      return i;
    }
  }
  return -1;
}
const defaultFilterOptions = createFilterOptions();
const pageSize = 5;
const defaultIsActiveElementInListbox = (listboxRef) => {
  var _listboxRef$current$p;
  return listboxRef.current !== null && ((_listboxRef$current$p = listboxRef.current.parentElement) == null ? void 0 : _listboxRef$current$p.contains(document.activeElement));
};
function useAutocomplete(props) {
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    unstable_isActiveElementInListbox = defaultIsActiveElementInListbox,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    unstable_classNamePrefix = "Mui",
    autoComplete = false,
    autoHighlight = false,
    autoSelect = false,
    blurOnSelect = false,
    clearOnBlur = !props.freeSolo,
    clearOnEscape = false,
    componentName = "useAutocomplete",
    defaultValue = props.multiple ? [] : null,
    disableClearable = false,
    disableCloseOnSelect = false,
    disabled: disabledProp,
    disabledItemsFocusable = false,
    disableListWrap = false,
    filterOptions = defaultFilterOptions,
    filterSelectedOptions = false,
    freeSolo = false,
    getOptionDisabled,
    getOptionKey,
    getOptionLabel: getOptionLabelProp = (option) => {
      var _option$label;
      return (_option$label = option.label) != null ? _option$label : option;
    },
    groupBy,
    handleHomeEndKeys = !props.freeSolo,
    id: idProp,
    includeInputInList = false,
    inputValue: inputValueProp,
    isOptionEqualToValue = (option, value2) => option === value2,
    multiple = false,
    onChange,
    onClose,
    onHighlightChange,
    onInputChange,
    onOpen,
    open: openProp,
    openOnFocus = false,
    options,
    readOnly = false,
    selectOnFocus = !props.freeSolo,
    value: valueProp
  } = props;
  const id = useId(idProp);
  let getOptionLabel = getOptionLabelProp;
  getOptionLabel = (option) => {
    const optionLabel = getOptionLabelProp(option);
    if (typeof optionLabel !== "string") {
      return String(optionLabel);
    }
    return optionLabel;
  };
  const ignoreFocus = reactExports.useRef(false);
  const firstFocus = reactExports.useRef(true);
  const inputRef = reactExports.useRef(null);
  const listboxRef = reactExports.useRef(null);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [focusedTag, setFocusedTag] = reactExports.useState(-1);
  const defaultHighlighted = autoHighlight ? 0 : -1;
  const highlightedIndexRef = reactExports.useRef(defaultHighlighted);
  const [value, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: componentName
  });
  const [inputValue, setInputValueState] = useControlled({
    controlled: inputValueProp,
    default: "",
    name: componentName,
    state: "inputValue"
  });
  const [focused, setFocused] = reactExports.useState(false);
  const resetInputValue = reactExports.useCallback((event, newValue) => {
    const isOptionSelected = multiple ? value.length < newValue.length : newValue !== null;
    if (!isOptionSelected && !clearOnBlur) {
      return;
    }
    let newInputValue;
    if (multiple) {
      newInputValue = "";
    } else if (newValue == null) {
      newInputValue = "";
    } else {
      const optionLabel = getOptionLabel(newValue);
      newInputValue = typeof optionLabel === "string" ? optionLabel : "";
    }
    if (inputValue === newInputValue) {
      return;
    }
    setInputValueState(newInputValue);
    if (onInputChange) {
      onInputChange(event, newInputValue, "reset");
    }
  }, [getOptionLabel, inputValue, multiple, onInputChange, setInputValueState, clearOnBlur, value]);
  const [open, setOpenState] = useControlled({
    controlled: openProp,
    default: false,
    name: componentName,
    state: "open"
  });
  const [inputPristine, setInputPristine] = reactExports.useState(true);
  const inputValueIsSelectedValue = !multiple && value != null && inputValue === getOptionLabel(value);
  const popupOpen = open && !readOnly;
  const filteredOptions = popupOpen ? filterOptions(
    options.filter((option) => {
      if (filterSelectedOptions && (multiple ? value : [value]).some((value2) => value2 !== null && isOptionEqualToValue(option, value2))) {
        return false;
      }
      return true;
    }),
    // we use the empty string to manipulate `filterOptions` to not filter any options
    // i.e. the filter predicate always returns true
    {
      inputValue: inputValueIsSelectedValue && inputPristine ? "" : inputValue,
      getOptionLabel
    }
  ) : [];
  const previousProps = usePreviousProps({
    filteredOptions,
    value,
    inputValue
  });
  reactExports.useEffect(() => {
    const valueChange = value !== previousProps.value;
    if (focused && !valueChange) {
      return;
    }
    if (freeSolo && !valueChange) {
      return;
    }
    resetInputValue(null, value);
  }, [value, resetInputValue, focused, previousProps.value, freeSolo]);
  const listboxAvailable = open && filteredOptions.length > 0 && !readOnly;
  const focusTag = useEventCallback((tagToFocus) => {
    if (tagToFocus === -1) {
      inputRef.current.focus();
    } else {
      anchorEl.querySelector(`[data-tag-index="${tagToFocus}"]`).focus();
    }
  });
  reactExports.useEffect(() => {
    if (multiple && focusedTag > value.length - 1) {
      setFocusedTag(-1);
      focusTag(-1);
    }
  }, [value, multiple, focusedTag, focusTag]);
  function validOptionIndex(index, direction) {
    if (!listboxRef.current || index < 0 || index >= filteredOptions.length) {
      return -1;
    }
    let nextFocus = index;
    while (true) {
      const option = listboxRef.current.querySelector(`[data-option-index="${nextFocus}"]`);
      const nextFocusDisabled = disabledItemsFocusable ? false : !option || option.disabled || option.getAttribute("aria-disabled") === "true";
      if (option && option.hasAttribute("tabindex") && !nextFocusDisabled) {
        return nextFocus;
      }
      if (direction === "next") {
        nextFocus = (nextFocus + 1) % filteredOptions.length;
      } else {
        nextFocus = (nextFocus - 1 + filteredOptions.length) % filteredOptions.length;
      }
      if (nextFocus === index) {
        return -1;
      }
    }
  }
  const setHighlightedIndex = useEventCallback(({
    event,
    index,
    reason = "auto"
  }) => {
    highlightedIndexRef.current = index;
    if (index === -1) {
      inputRef.current.removeAttribute("aria-activedescendant");
    } else {
      inputRef.current.setAttribute("aria-activedescendant", `${id}-option-${index}`);
    }
    if (onHighlightChange) {
      onHighlightChange(event, index === -1 ? null : filteredOptions[index], reason);
    }
    if (!listboxRef.current) {
      return;
    }
    const prev = listboxRef.current.querySelector(`[role="option"].${unstable_classNamePrefix}-focused`);
    if (prev) {
      prev.classList.remove(`${unstable_classNamePrefix}-focused`);
      prev.classList.remove(`${unstable_classNamePrefix}-focusVisible`);
    }
    let listboxNode = listboxRef.current;
    if (listboxRef.current.getAttribute("role") !== "listbox") {
      listboxNode = listboxRef.current.parentElement.querySelector('[role="listbox"]');
    }
    if (!listboxNode) {
      return;
    }
    if (index === -1) {
      listboxNode.scrollTop = 0;
      return;
    }
    const option = listboxRef.current.querySelector(`[data-option-index="${index}"]`);
    if (!option) {
      return;
    }
    option.classList.add(`${unstable_classNamePrefix}-focused`);
    if (reason === "keyboard") {
      option.classList.add(`${unstable_classNamePrefix}-focusVisible`);
    }
    if (listboxNode.scrollHeight > listboxNode.clientHeight && reason !== "mouse" && reason !== "touch") {
      const element = option;
      const scrollBottom = listboxNode.clientHeight + listboxNode.scrollTop;
      const elementBottom = element.offsetTop + element.offsetHeight;
      if (elementBottom > scrollBottom) {
        listboxNode.scrollTop = elementBottom - listboxNode.clientHeight;
      } else if (element.offsetTop - element.offsetHeight * (groupBy ? 1.3 : 0) < listboxNode.scrollTop) {
        listboxNode.scrollTop = element.offsetTop - element.offsetHeight * (groupBy ? 1.3 : 0);
      }
    }
  });
  const changeHighlightedIndex = useEventCallback(({
    event,
    diff,
    direction = "next",
    reason = "auto"
  }) => {
    if (!popupOpen) {
      return;
    }
    const getNextIndex = () => {
      const maxIndex = filteredOptions.length - 1;
      if (diff === "reset") {
        return defaultHighlighted;
      }
      if (diff === "start") {
        return 0;
      }
      if (diff === "end") {
        return maxIndex;
      }
      const newIndex = highlightedIndexRef.current + diff;
      if (newIndex < 0) {
        if (newIndex === -1 && includeInputInList) {
          return -1;
        }
        if (disableListWrap && highlightedIndexRef.current !== -1 || Math.abs(diff) > 1) {
          return 0;
        }
        return maxIndex;
      }
      if (newIndex > maxIndex) {
        if (newIndex === maxIndex + 1 && includeInputInList) {
          return -1;
        }
        if (disableListWrap || Math.abs(diff) > 1) {
          return maxIndex;
        }
        return 0;
      }
      return newIndex;
    };
    const nextIndex = validOptionIndex(getNextIndex(), direction);
    setHighlightedIndex({
      index: nextIndex,
      reason,
      event
    });
    if (autoComplete && diff !== "reset") {
      if (nextIndex === -1) {
        inputRef.current.value = inputValue;
      } else {
        const option = getOptionLabel(filteredOptions[nextIndex]);
        inputRef.current.value = option;
        const index = option.toLowerCase().indexOf(inputValue.toLowerCase());
        if (index === 0 && inputValue.length > 0) {
          inputRef.current.setSelectionRange(inputValue.length, option.length);
        }
      }
    }
  });
  const getPreviousHighlightedOptionIndex = () => {
    const isSameValue = (value1, value2) => {
      const label1 = value1 ? getOptionLabel(value1) : "";
      const label2 = value2 ? getOptionLabel(value2) : "";
      return label1 === label2;
    };
    if (highlightedIndexRef.current !== -1 && previousProps.filteredOptions && previousProps.filteredOptions.length !== filteredOptions.length && previousProps.inputValue === inputValue && (multiple ? value.length === previousProps.value.length && previousProps.value.every((val, i) => getOptionLabel(value[i]) === getOptionLabel(val)) : isSameValue(previousProps.value, value))) {
      const previousHighlightedOption = previousProps.filteredOptions[highlightedIndexRef.current];
      if (previousHighlightedOption) {
        return findIndex(filteredOptions, (option) => {
          return getOptionLabel(option) === getOptionLabel(previousHighlightedOption);
        });
      }
    }
    return -1;
  };
  const syncHighlightedIndex = reactExports.useCallback(() => {
    if (!popupOpen) {
      return;
    }
    const previousHighlightedOptionIndex = getPreviousHighlightedOptionIndex();
    if (previousHighlightedOptionIndex !== -1) {
      highlightedIndexRef.current = previousHighlightedOptionIndex;
      return;
    }
    const valueItem = multiple ? value[0] : value;
    if (filteredOptions.length === 0 || valueItem == null) {
      changeHighlightedIndex({
        diff: "reset"
      });
      return;
    }
    if (!listboxRef.current) {
      return;
    }
    if (valueItem != null) {
      const currentOption = filteredOptions[highlightedIndexRef.current];
      if (multiple && currentOption && findIndex(value, (val) => isOptionEqualToValue(currentOption, val)) !== -1) {
        return;
      }
      const itemIndex = findIndex(filteredOptions, (optionItem) => isOptionEqualToValue(optionItem, valueItem));
      if (itemIndex === -1) {
        changeHighlightedIndex({
          diff: "reset"
        });
      } else {
        setHighlightedIndex({
          index: itemIndex
        });
      }
      return;
    }
    if (highlightedIndexRef.current >= filteredOptions.length - 1) {
      setHighlightedIndex({
        index: filteredOptions.length - 1
      });
      return;
    }
    setHighlightedIndex({
      index: highlightedIndexRef.current
    });
  }, [
    // Only sync the highlighted index when the option switch between empty and not
    filteredOptions.length,
    // Don't sync the highlighted index with the value when multiple
    // eslint-disable-next-line react-hooks/exhaustive-deps
    multiple ? false : value,
    filterSelectedOptions,
    changeHighlightedIndex,
    setHighlightedIndex,
    popupOpen,
    inputValue,
    multiple
  ]);
  const handleListboxRef = useEventCallback((node) => {
    setRef(listboxRef, node);
    if (!node) {
      return;
    }
    syncHighlightedIndex();
  });
  reactExports.useEffect(() => {
    syncHighlightedIndex();
  }, [syncHighlightedIndex]);
  const handleOpen = (event) => {
    if (open) {
      return;
    }
    setOpenState(true);
    setInputPristine(true);
    if (onOpen) {
      onOpen(event);
    }
  };
  const handleClose = (event, reason) => {
    if (!open) {
      return;
    }
    setOpenState(false);
    if (onClose) {
      onClose(event, reason);
    }
  };
  const handleValue = (event, newValue, reason, details) => {
    if (multiple) {
      if (value.length === newValue.length && value.every((val, i) => val === newValue[i])) {
        return;
      }
    } else if (value === newValue) {
      return;
    }
    if (onChange) {
      onChange(event, newValue, reason, details);
    }
    setValueState(newValue);
  };
  const isTouch = reactExports.useRef(false);
  const selectNewValue = (event, option, reasonProp = "selectOption", origin = "options") => {
    let reason = reasonProp;
    let newValue = option;
    if (multiple) {
      newValue = Array.isArray(value) ? value.slice() : [];
      const itemIndex = findIndex(newValue, (valueItem) => isOptionEqualToValue(option, valueItem));
      if (itemIndex === -1) {
        newValue.push(option);
      } else if (origin !== "freeSolo") {
        newValue.splice(itemIndex, 1);
        reason = "removeOption";
      }
    }
    resetInputValue(event, newValue);
    handleValue(event, newValue, reason, {
      option
    });
    if (!disableCloseOnSelect && (!event || !event.ctrlKey && !event.metaKey)) {
      handleClose(event, reason);
    }
    if (blurOnSelect === true || blurOnSelect === "touch" && isTouch.current || blurOnSelect === "mouse" && !isTouch.current) {
      inputRef.current.blur();
    }
  };
  function validTagIndex(index, direction) {
    if (index === -1) {
      return -1;
    }
    let nextFocus = index;
    while (true) {
      if (direction === "next" && nextFocus === value.length || direction === "previous" && nextFocus === -1) {
        return -1;
      }
      const option = anchorEl.querySelector(`[data-tag-index="${nextFocus}"]`);
      if (!option || !option.hasAttribute("tabindex") || option.disabled || option.getAttribute("aria-disabled") === "true") {
        nextFocus += direction === "next" ? 1 : -1;
      } else {
        return nextFocus;
      }
    }
  }
  const handleFocusTag = (event, direction) => {
    if (!multiple) {
      return;
    }
    if (inputValue === "") {
      handleClose(event, "toggleInput");
    }
    let nextTag = focusedTag;
    if (focusedTag === -1) {
      if (inputValue === "" && direction === "previous") {
        nextTag = value.length - 1;
      }
    } else {
      nextTag += direction === "next" ? 1 : -1;
      if (nextTag < 0) {
        nextTag = 0;
      }
      if (nextTag === value.length) {
        nextTag = -1;
      }
    }
    nextTag = validTagIndex(nextTag, direction);
    setFocusedTag(nextTag);
    focusTag(nextTag);
  };
  const handleClear = (event) => {
    ignoreFocus.current = true;
    setInputValueState("");
    if (onInputChange) {
      onInputChange(event, "", "clear");
    }
    handleValue(event, multiple ? [] : null, "clear");
  };
  const handleKeyDown2 = (other) => (event) => {
    if (other.onKeyDown) {
      other.onKeyDown(event);
    }
    if (event.defaultMuiPrevented) {
      return;
    }
    if (focusedTag !== -1 && ["ArrowLeft", "ArrowRight"].indexOf(event.key) === -1) {
      setFocusedTag(-1);
      focusTag(-1);
    }
    if (event.which !== 229) {
      switch (event.key) {
        case "Home":
          if (popupOpen && handleHomeEndKeys) {
            event.preventDefault();
            changeHighlightedIndex({
              diff: "start",
              direction: "next",
              reason: "keyboard",
              event
            });
          }
          break;
        case "End":
          if (popupOpen && handleHomeEndKeys) {
            event.preventDefault();
            changeHighlightedIndex({
              diff: "end",
              direction: "previous",
              reason: "keyboard",
              event
            });
          }
          break;
        case "PageUp":
          event.preventDefault();
          changeHighlightedIndex({
            diff: -pageSize,
            direction: "previous",
            reason: "keyboard",
            event
          });
          handleOpen(event);
          break;
        case "PageDown":
          event.preventDefault();
          changeHighlightedIndex({
            diff: pageSize,
            direction: "next",
            reason: "keyboard",
            event
          });
          handleOpen(event);
          break;
        case "ArrowDown":
          event.preventDefault();
          changeHighlightedIndex({
            diff: 1,
            direction: "next",
            reason: "keyboard",
            event
          });
          handleOpen(event);
          break;
        case "ArrowUp":
          event.preventDefault();
          changeHighlightedIndex({
            diff: -1,
            direction: "previous",
            reason: "keyboard",
            event
          });
          handleOpen(event);
          break;
        case "ArrowLeft":
          handleFocusTag(event, "previous");
          break;
        case "ArrowRight":
          handleFocusTag(event, "next");
          break;
        case "Enter":
          if (highlightedIndexRef.current !== -1 && popupOpen) {
            const option = filteredOptions[highlightedIndexRef.current];
            const disabled = getOptionDisabled ? getOptionDisabled(option) : false;
            event.preventDefault();
            if (disabled) {
              return;
            }
            selectNewValue(event, option, "selectOption");
            if (autoComplete) {
              inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
            }
          } else if (freeSolo && inputValue !== "" && inputValueIsSelectedValue === false) {
            if (multiple) {
              event.preventDefault();
            }
            selectNewValue(event, inputValue, "createOption", "freeSolo");
          }
          break;
        case "Escape":
          if (popupOpen) {
            event.preventDefault();
            event.stopPropagation();
            handleClose(event, "escape");
          } else if (clearOnEscape && (inputValue !== "" || multiple && value.length > 0)) {
            event.preventDefault();
            event.stopPropagation();
            handleClear(event);
          }
          break;
        case "Backspace":
          if (multiple && !readOnly && inputValue === "" && value.length > 0) {
            const index = focusedTag === -1 ? value.length - 1 : focusedTag;
            const newValue = value.slice();
            newValue.splice(index, 1);
            handleValue(event, newValue, "removeOption", {
              option: value[index]
            });
          }
          break;
        case "Delete":
          if (multiple && !readOnly && inputValue === "" && value.length > 0 && focusedTag !== -1) {
            const index = focusedTag;
            const newValue = value.slice();
            newValue.splice(index, 1);
            handleValue(event, newValue, "removeOption", {
              option: value[index]
            });
          }
          break;
      }
    }
  };
  const handleFocus = (event) => {
    setFocused(true);
    if (openOnFocus && !ignoreFocus.current) {
      handleOpen(event);
    }
  };
  const handleBlur = (event) => {
    if (unstable_isActiveElementInListbox(listboxRef)) {
      inputRef.current.focus();
      return;
    }
    setFocused(false);
    firstFocus.current = true;
    ignoreFocus.current = false;
    if (autoSelect && highlightedIndexRef.current !== -1 && popupOpen) {
      selectNewValue(event, filteredOptions[highlightedIndexRef.current], "blur");
    } else if (autoSelect && freeSolo && inputValue !== "") {
      selectNewValue(event, inputValue, "blur", "freeSolo");
    } else if (clearOnBlur) {
      resetInputValue(event, value);
    }
    handleClose(event, "blur");
  };
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    if (inputValue !== newValue) {
      setInputValueState(newValue);
      setInputPristine(false);
      if (onInputChange) {
        onInputChange(event, newValue, "input");
      }
    }
    if (newValue === "") {
      if (!disableClearable && !multiple) {
        handleValue(event, null, "clear");
      }
    } else {
      handleOpen(event);
    }
  };
  const handleOptionMouseMove = (event) => {
    const index = Number(event.currentTarget.getAttribute("data-option-index"));
    if (highlightedIndexRef.current !== index) {
      setHighlightedIndex({
        event,
        index,
        reason: "mouse"
      });
    }
  };
  const handleOptionTouchStart = (event) => {
    setHighlightedIndex({
      event,
      index: Number(event.currentTarget.getAttribute("data-option-index")),
      reason: "touch"
    });
    isTouch.current = true;
  };
  const handleOptionClick = (event) => {
    const index = Number(event.currentTarget.getAttribute("data-option-index"));
    selectNewValue(event, filteredOptions[index], "selectOption");
    isTouch.current = false;
  };
  const handleTagDelete = (index) => (event) => {
    const newValue = value.slice();
    newValue.splice(index, 1);
    handleValue(event, newValue, "removeOption", {
      option: value[index]
    });
  };
  const handlePopupIndicator = (event) => {
    if (open) {
      handleClose(event, "toggleInput");
    } else {
      handleOpen(event);
    }
  };
  const handleMouseDown = (event) => {
    if (!event.currentTarget.contains(event.target)) {
      return;
    }
    if (event.target.getAttribute("id") !== id) {
      event.preventDefault();
    }
  };
  const handleClick = (event) => {
    if (!event.currentTarget.contains(event.target)) {
      return;
    }
    inputRef.current.focus();
    if (selectOnFocus && firstFocus.current && inputRef.current.selectionEnd - inputRef.current.selectionStart === 0) {
      inputRef.current.select();
    }
    firstFocus.current = false;
  };
  const handleInputMouseDown = (event) => {
    if (!disabledProp && (inputValue === "" || !open)) {
      handlePopupIndicator(event);
    }
  };
  let dirty = freeSolo && inputValue.length > 0;
  dirty = dirty || (multiple ? value.length > 0 : value !== null);
  let groupedOptions = filteredOptions;
  if (groupBy) {
    groupedOptions = filteredOptions.reduce((acc, option, index) => {
      const group = groupBy(option);
      if (acc.length > 0 && acc[acc.length - 1].group === group) {
        acc[acc.length - 1].options.push(option);
      } else {
        acc.push({
          key: index,
          index,
          group,
          options: [option]
        });
      }
      return acc;
    }, []);
  }
  if (disabledProp && focused) {
    handleBlur();
  }
  return {
    getRootProps: (other = {}) => _extends({
      "aria-owns": listboxAvailable ? `${id}-listbox` : null
    }, other, {
      onKeyDown: handleKeyDown2(other),
      onMouseDown: handleMouseDown,
      onClick: handleClick
    }),
    getInputLabelProps: () => ({
      id: `${id}-label`,
      htmlFor: id
    }),
    getInputProps: () => ({
      id,
      value: inputValue,
      onBlur: handleBlur,
      onFocus: handleFocus,
      onChange: handleInputChange,
      onMouseDown: handleInputMouseDown,
      // if open then this is handled imperatively so don't let react override
      // only have an opinion about this when closed
      "aria-activedescendant": popupOpen ? "" : null,
      "aria-autocomplete": autoComplete ? "both" : "list",
      "aria-controls": listboxAvailable ? `${id}-listbox` : void 0,
      "aria-expanded": listboxAvailable,
      // Disable browser's suggestion that might overlap with the popup.
      // Handle autocomplete but not autofill.
      autoComplete: "off",
      ref: inputRef,
      autoCapitalize: "none",
      spellCheck: "false",
      role: "combobox",
      disabled: disabledProp
    }),
    getClearProps: () => ({
      tabIndex: -1,
      type: "button",
      onClick: handleClear
    }),
    getPopupIndicatorProps: () => ({
      tabIndex: -1,
      type: "button",
      onClick: handlePopupIndicator
    }),
    getTagProps: ({
      index
    }) => _extends({
      key: index,
      "data-tag-index": index,
      tabIndex: -1
    }, !readOnly && {
      onDelete: handleTagDelete(index)
    }),
    getListboxProps: () => ({
      role: "listbox",
      id: `${id}-listbox`,
      "aria-labelledby": `${id}-label`,
      ref: handleListboxRef,
      onMouseDown: (event) => {
        event.preventDefault();
      }
    }),
    getOptionProps: ({
      index,
      option
    }) => {
      var _getOptionKey;
      const selected = (multiple ? value : [value]).some((value2) => value2 != null && isOptionEqualToValue(option, value2));
      const disabled = getOptionDisabled ? getOptionDisabled(option) : false;
      return {
        key: (_getOptionKey = getOptionKey == null ? void 0 : getOptionKey(option)) != null ? _getOptionKey : getOptionLabel(option),
        tabIndex: -1,
        role: "option",
        id: `${id}-option-${index}`,
        onMouseMove: handleOptionMouseMove,
        onClick: handleOptionClick,
        onTouchStart: handleOptionTouchStart,
        "data-option-index": index,
        "aria-disabled": disabled,
        "aria-selected": selected
      };
    },
    id,
    inputValue,
    value,
    dirty,
    expanded: popupOpen && anchorEl,
    popupOpen,
    focused: focused || focusedTag !== -1,
    anchorEl,
    setAnchorEl,
    focusedTag,
    groupedOptions
  };
}
function formControlState({
  props,
  states,
  muiFormControl
}) {
  return states.reduce((acc, state) => {
    acc[state] = props[state];
    if (muiFormControl) {
      if (typeof props[state] === "undefined") {
        acc[state] = muiFormControl[state];
      }
    }
    return acc;
  }, {});
}
const FormControlContext = /* @__PURE__ */ reactExports.createContext(void 0);
function useFormControl() {
  return reactExports.useContext(FormControlContext);
}
function GlobalStyles(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalStyles$1, _extends({}, props, {
    defaultTheme: defaultTheme$1,
    themeId: THEME_ID
  }));
}
function hasValue(value) {
  return value != null && !(Array.isArray(value) && value.length === 0);
}
function isFilled(obj, SSR = false) {
  return obj && (hasValue(obj.value) && obj.value !== "" || SSR && hasValue(obj.defaultValue) && obj.defaultValue !== "");
}
function isAdornedStart(obj) {
  return obj.startAdornment;
}
function getInputBaseUtilityClass(slot) {
  return generateUtilityClass$2("MuiInputBase", slot);
}
const inputBaseClasses = generateUtilityClasses("MuiInputBase", ["root", "formControl", "focused", "disabled", "adornedStart", "adornedEnd", "error", "sizeSmall", "multiline", "colorSecondary", "fullWidth", "hiddenLabel", "readOnly", "input", "inputSizeSmall", "inputMultiline", "inputTypeSearch", "inputAdornedStart", "inputAdornedEnd", "inputHiddenLabel"]);
const _excluded$1C = ["aria-describedby", "autoComplete", "autoFocus", "className", "color", "components", "componentsProps", "defaultValue", "disabled", "disableInjectingGlobalStyles", "endAdornment", "error", "fullWidth", "id", "inputComponent", "inputProps", "inputRef", "margin", "maxRows", "minRows", "multiline", "name", "onBlur", "onChange", "onClick", "onFocus", "onKeyDown", "onKeyUp", "placeholder", "readOnly", "renderSuffix", "rows", "size", "slotProps", "slots", "startAdornment", "type", "value"];
const rootOverridesResolver = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, ownerState.formControl && styles2.formControl, ownerState.startAdornment && styles2.adornedStart, ownerState.endAdornment && styles2.adornedEnd, ownerState.error && styles2.error, ownerState.size === "small" && styles2.sizeSmall, ownerState.multiline && styles2.multiline, ownerState.color && styles2[`color${capitalize$1(ownerState.color)}`], ownerState.fullWidth && styles2.fullWidth, ownerState.hiddenLabel && styles2.hiddenLabel];
};
const inputOverridesResolver = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.input, ownerState.size === "small" && styles2.inputSizeSmall, ownerState.multiline && styles2.inputMultiline, ownerState.type === "search" && styles2.inputTypeSearch, ownerState.startAdornment && styles2.inputAdornedStart, ownerState.endAdornment && styles2.inputAdornedEnd, ownerState.hiddenLabel && styles2.inputHiddenLabel];
};
const useUtilityClasses$1s = (ownerState) => {
  const {
    classes,
    color: color2,
    disabled,
    error,
    endAdornment,
    focused,
    formControl,
    fullWidth,
    hiddenLabel,
    multiline,
    readOnly,
    size,
    startAdornment,
    type
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2)}`, disabled && "disabled", error && "error", fullWidth && "fullWidth", focused && "focused", formControl && "formControl", size && size !== "medium" && `size${capitalize$1(size)}`, multiline && "multiline", startAdornment && "adornedStart", endAdornment && "adornedEnd", hiddenLabel && "hiddenLabel", readOnly && "readOnly"],
    input: ["input", disabled && "disabled", type === "search" && "inputTypeSearch", multiline && "inputMultiline", size === "small" && "inputSizeSmall", hiddenLabel && "inputHiddenLabel", startAdornment && "inputAdornedStart", endAdornment && "inputAdornedEnd", readOnly && "readOnly"]
  };
  return composeClasses(slots, getInputBaseUtilityClass, classes);
};
const InputBaseRoot = styled("div", {
  name: "MuiInputBase",
  slot: "Root",
  overridesResolver: rootOverridesResolver
})(({
  theme,
  ownerState
}) => _extends({}, theme.typography.body1, {
  color: (theme.vars || theme).palette.text.primary,
  lineHeight: "1.4375em",
  // 23px
  boxSizing: "border-box",
  // Prevent padding issue with fullWidth.
  position: "relative",
  cursor: "text",
  display: "inline-flex",
  alignItems: "center",
  [`&.${inputBaseClasses.disabled}`]: {
    color: (theme.vars || theme).palette.text.disabled,
    cursor: "default"
  }
}, ownerState.multiline && _extends({
  padding: "4px 0 5px"
}, ownerState.size === "small" && {
  paddingTop: 1
}), ownerState.fullWidth && {
  width: "100%"
}));
const InputBaseComponent = styled("input", {
  name: "MuiInputBase",
  slot: "Input",
  overridesResolver: inputOverridesResolver
})(({
  theme,
  ownerState
}) => {
  const light2 = theme.palette.mode === "light";
  const placeholder = _extends({
    color: "currentColor"
  }, theme.vars ? {
    opacity: theme.vars.opacity.inputPlaceholder
  } : {
    opacity: light2 ? 0.42 : 0.5
  }, {
    transition: theme.transitions.create("opacity", {
      duration: theme.transitions.duration.shorter
    })
  });
  const placeholderHidden = {
    opacity: "0 !important"
  };
  const placeholderVisible = theme.vars ? {
    opacity: theme.vars.opacity.inputPlaceholder
  } : {
    opacity: light2 ? 0.42 : 0.5
  };
  return _extends({
    font: "inherit",
    letterSpacing: "inherit",
    color: "currentColor",
    padding: "4px 0 5px",
    border: 0,
    boxSizing: "content-box",
    background: "none",
    height: "1.4375em",
    // Reset 23pxthe native input line-height
    margin: 0,
    // Reset for Safari
    WebkitTapHighlightColor: "transparent",
    display: "block",
    // Make the flex item shrink with Firefox
    minWidth: 0,
    width: "100%",
    // Fix IE11 width issue
    animationName: "mui-auto-fill-cancel",
    animationDuration: "10ms",
    "&::-webkit-input-placeholder": placeholder,
    "&::-moz-placeholder": placeholder,
    // Firefox 19+
    "&:-ms-input-placeholder": placeholder,
    // IE11
    "&::-ms-input-placeholder": placeholder,
    // Edge
    "&:focus": {
      outline: 0
    },
    // Reset Firefox invalid required input style
    "&:invalid": {
      boxShadow: "none"
    },
    "&::-webkit-search-decoration": {
      // Remove the padding when type=search.
      WebkitAppearance: "none"
    },
    // Show and hide the placeholder logic
    [`label[data-shrink=false] + .${inputBaseClasses.formControl} &`]: {
      "&::-webkit-input-placeholder": placeholderHidden,
      "&::-moz-placeholder": placeholderHidden,
      // Firefox 19+
      "&:-ms-input-placeholder": placeholderHidden,
      // IE11
      "&::-ms-input-placeholder": placeholderHidden,
      // Edge
      "&:focus::-webkit-input-placeholder": placeholderVisible,
      "&:focus::-moz-placeholder": placeholderVisible,
      // Firefox 19+
      "&:focus:-ms-input-placeholder": placeholderVisible,
      // IE11
      "&:focus::-ms-input-placeholder": placeholderVisible
      // Edge
    },
    [`&.${inputBaseClasses.disabled}`]: {
      opacity: 1,
      // Reset iOS opacity
      WebkitTextFillColor: (theme.vars || theme).palette.text.disabled
      // Fix opacity Safari bug
    },
    "&:-webkit-autofill": {
      animationDuration: "5000s",
      animationName: "mui-auto-fill"
    }
  }, ownerState.size === "small" && {
    paddingTop: 1
  }, ownerState.multiline && {
    height: "auto",
    resize: "none",
    padding: 0,
    paddingTop: 0
  }, ownerState.type === "search" && {
    // Improve type search style.
    MozAppearance: "textfield"
  });
});
const inputGlobalStyles = /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalStyles, {
  styles: {
    "@keyframes mui-auto-fill": {
      from: {
        display: "block"
      }
    },
    "@keyframes mui-auto-fill-cancel": {
      from: {
        display: "block"
      }
    }
  }
});
const InputBase = /* @__PURE__ */ reactExports.forwardRef(function InputBase2(inProps, ref) {
  var _slotProps$input;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiInputBase"
  });
  const {
    "aria-describedby": ariaDescribedby,
    autoComplete,
    autoFocus,
    className,
    components = {},
    componentsProps = {},
    defaultValue,
    disabled,
    disableInjectingGlobalStyles,
    endAdornment,
    fullWidth = false,
    id,
    inputComponent = "input",
    inputProps: inputPropsProp = {},
    inputRef: inputRefProp,
    maxRows,
    minRows,
    multiline = false,
    name,
    onBlur,
    onChange,
    onClick,
    onFocus,
    onKeyDown,
    onKeyUp,
    placeholder,
    readOnly,
    renderSuffix,
    rows,
    slotProps = {},
    slots = {},
    startAdornment,
    type = "text",
    value: valueProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1C);
  const value = inputPropsProp.value != null ? inputPropsProp.value : valueProp;
  const {
    current: isControlled
  } = reactExports.useRef(value != null);
  const inputRef = reactExports.useRef();
  const handleInputRefWarning = reactExports.useCallback((instance) => {
  }, []);
  const handleInputRef = useForkRef(inputRef, inputRefProp, inputPropsProp.ref, handleInputRefWarning);
  const [focused, setFocused] = reactExports.useState(false);
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["color", "disabled", "error", "hiddenLabel", "size", "required", "filled"]
  });
  fcs.focused = muiFormControl ? muiFormControl.focused : focused;
  reactExports.useEffect(() => {
    if (!muiFormControl && disabled && focused) {
      setFocused(false);
      if (onBlur) {
        onBlur();
      }
    }
  }, [muiFormControl, disabled, focused, onBlur]);
  const onFilled = muiFormControl && muiFormControl.onFilled;
  const onEmpty = muiFormControl && muiFormControl.onEmpty;
  const checkDirty = reactExports.useCallback((obj) => {
    if (isFilled(obj)) {
      if (onFilled) {
        onFilled();
      }
    } else if (onEmpty) {
      onEmpty();
    }
  }, [onFilled, onEmpty]);
  useEnhancedEffect(() => {
    if (isControlled) {
      checkDirty({
        value
      });
    }
  }, [value, checkDirty, isControlled]);
  const handleFocus = (event) => {
    if (fcs.disabled) {
      event.stopPropagation();
      return;
    }
    if (onFocus) {
      onFocus(event);
    }
    if (inputPropsProp.onFocus) {
      inputPropsProp.onFocus(event);
    }
    if (muiFormControl && muiFormControl.onFocus) {
      muiFormControl.onFocus(event);
    } else {
      setFocused(true);
    }
  };
  const handleBlur = (event) => {
    if (onBlur) {
      onBlur(event);
    }
    if (inputPropsProp.onBlur) {
      inputPropsProp.onBlur(event);
    }
    if (muiFormControl && muiFormControl.onBlur) {
      muiFormControl.onBlur(event);
    } else {
      setFocused(false);
    }
  };
  const handleChange = (event, ...args) => {
    if (!isControlled) {
      const element = event.target || inputRef.current;
      if (element == null) {
        throw new Error(formatMuiErrorMessage$1(1));
      }
      checkDirty({
        value: element.value
      });
    }
    if (inputPropsProp.onChange) {
      inputPropsProp.onChange(event, ...args);
    }
    if (onChange) {
      onChange(event, ...args);
    }
  };
  reactExports.useEffect(() => {
    checkDirty(inputRef.current);
  }, []);
  const handleClick = (event) => {
    if (inputRef.current && event.currentTarget === event.target) {
      inputRef.current.focus();
    }
    if (onClick) {
      onClick(event);
    }
  };
  let InputComponent = inputComponent;
  let inputProps = inputPropsProp;
  if (multiline && InputComponent === "input") {
    if (rows) {
      inputProps = _extends({
        type: void 0,
        minRows: rows,
        maxRows: rows
      }, inputProps);
    } else {
      inputProps = _extends({
        type: void 0,
        maxRows,
        minRows
      }, inputProps);
    }
    InputComponent = TextareaAutosize;
  }
  const handleAutoFill = (event) => {
    checkDirty(event.animationName === "mui-auto-fill-cancel" ? inputRef.current : {
      value: "x"
    });
  };
  reactExports.useEffect(() => {
    if (muiFormControl) {
      muiFormControl.setAdornedStart(Boolean(startAdornment));
    }
  }, [muiFormControl, startAdornment]);
  const ownerState = _extends({}, props, {
    color: fcs.color || "primary",
    disabled: fcs.disabled,
    endAdornment,
    error: fcs.error,
    focused: fcs.focused,
    formControl: muiFormControl,
    fullWidth,
    hiddenLabel: fcs.hiddenLabel,
    multiline,
    size: fcs.size,
    startAdornment,
    type
  });
  const classes = useUtilityClasses$1s(ownerState);
  const Root = slots.root || components.Root || InputBaseRoot;
  const rootProps = slotProps.root || componentsProps.root || {};
  const Input3 = slots.input || components.Input || InputBaseComponent;
  inputProps = _extends({}, inputProps, (_slotProps$input = slotProps.input) != null ? _slotProps$input : componentsProps.input);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [!disableInjectingGlobalStyles && inputGlobalStyles, /* @__PURE__ */ jsxRuntimeExports.jsxs(Root, _extends({}, rootProps, !isHostComponent(Root) && {
      ownerState: _extends({}, ownerState, rootProps.ownerState)
    }, {
      ref,
      onClick: handleClick
    }, other, {
      className: clsx(classes.root, rootProps.className, className, readOnly && "MuiInputBase-readOnly"),
      children: [startAdornment, /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlContext.Provider, {
        value: null,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input3, _extends({
          ownerState,
          "aria-invalid": fcs.error,
          "aria-describedby": ariaDescribedby,
          autoComplete,
          autoFocus,
          defaultValue,
          disabled: fcs.disabled,
          id,
          onAnimationStart: handleAutoFill,
          name,
          placeholder,
          readOnly,
          required: fcs.required,
          rows,
          value,
          onKeyDown,
          onKeyUp,
          type
        }, inputProps, !isHostComponent(Input3) && {
          as: InputComponent,
          ownerState: _extends({}, ownerState, inputProps.ownerState)
        }, {
          ref: handleInputRef,
          className: clsx(classes.input, inputProps.className, readOnly && "MuiInputBase-readOnly"),
          onBlur: handleBlur,
          onChange: handleChange,
          onFocus: handleFocus
        }))
      }), endAdornment, renderSuffix ? renderSuffix(_extends({}, fcs, {
        startAdornment
      })) : null]
    }))]
  });
});
function getInputUtilityClass(slot) {
  return generateUtilityClass$2("MuiInput", slot);
}
const inputClasses = _extends({}, inputBaseClasses, generateUtilityClasses("MuiInput", ["root", "underline", "input"]));
const _excluded$1B = ["disableUnderline", "components", "componentsProps", "fullWidth", "inputComponent", "multiline", "slotProps", "slots", "type"];
const useUtilityClasses$1r = (ownerState) => {
  const {
    classes,
    disableUnderline
  } = ownerState;
  const slots = {
    root: ["root", !disableUnderline && "underline"],
    input: ["input"]
  };
  const composedClasses = composeClasses(slots, getInputUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const InputRoot = styled(InputBaseRoot, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiInput",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [...rootOverridesResolver(props, styles2), !ownerState.disableUnderline && styles2.underline];
  }
})(({
  theme,
  ownerState
}) => {
  const light2 = theme.palette.mode === "light";
  let bottomLineColor = light2 ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)";
  if (theme.vars) {
    bottomLineColor = `rgba(${theme.vars.palette.common.onBackgroundChannel} / ${theme.vars.opacity.inputUnderline})`;
  }
  return _extends({
    position: "relative"
  }, ownerState.formControl && {
    "label + &": {
      marginTop: 16
    }
  }, !ownerState.disableUnderline && {
    "&::after": {
      borderBottom: `2px solid ${(theme.vars || theme).palette[ownerState.color].main}`,
      left: 0,
      bottom: 0,
      // Doing the other way around crash on IE11 "''" https://github.com/cssinjs/jss/issues/242
      content: '""',
      position: "absolute",
      right: 0,
      transform: "scaleX(0)",
      transition: theme.transitions.create("transform", {
        duration: theme.transitions.duration.shorter,
        easing: theme.transitions.easing.easeOut
      }),
      pointerEvents: "none"
      // Transparent to the hover style.
    },
    [`&.${inputClasses.focused}:after`]: {
      // translateX(0) is a workaround for Safari transform scale bug
      // See https://github.com/mui/material-ui/issues/31766
      transform: "scaleX(1) translateX(0)"
    },
    [`&.${inputClasses.error}`]: {
      "&::before, &::after": {
        borderBottomColor: (theme.vars || theme).palette.error.main
      }
    },
    "&::before": {
      borderBottom: `1px solid ${bottomLineColor}`,
      left: 0,
      bottom: 0,
      // Doing the other way around crash on IE11 "''" https://github.com/cssinjs/jss/issues/242
      content: '"\\00a0"',
      position: "absolute",
      right: 0,
      transition: theme.transitions.create("border-bottom-color", {
        duration: theme.transitions.duration.shorter
      }),
      pointerEvents: "none"
      // Transparent to the hover style.
    },
    [`&:hover:not(.${inputClasses.disabled}, .${inputClasses.error}):before`]: {
      borderBottom: `2px solid ${(theme.vars || theme).palette.text.primary}`,
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        borderBottom: `1px solid ${bottomLineColor}`
      }
    },
    [`&.${inputClasses.disabled}:before`]: {
      borderBottomStyle: "dotted"
    }
  });
});
const InputInput = styled(InputBaseComponent, {
  name: "MuiInput",
  slot: "Input",
  overridesResolver: inputOverridesResolver
})({});
const Input = /* @__PURE__ */ reactExports.forwardRef(function Input2(inProps, ref) {
  var _ref, _slots$root, _ref2, _slots$input;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiInput"
  });
  const {
    disableUnderline,
    components = {},
    componentsProps: componentsPropsProp,
    fullWidth = false,
    inputComponent = "input",
    multiline = false,
    slotProps,
    slots = {},
    type = "text"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1B);
  const classes = useUtilityClasses$1r(props);
  const ownerState = {
    disableUnderline
  };
  const inputComponentsProps = {
    root: {
      ownerState
    }
  };
  const componentsProps = (slotProps != null ? slotProps : componentsPropsProp) ? deepmerge$1(slotProps != null ? slotProps : componentsPropsProp, inputComponentsProps) : inputComponentsProps;
  const RootSlot = (_ref = (_slots$root = slots.root) != null ? _slots$root : components.Root) != null ? _ref : InputRoot;
  const InputSlot = (_ref2 = (_slots$input = slots.input) != null ? _slots$input : components.Input) != null ? _ref2 : InputInput;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InputBase, _extends({
    slots: {
      root: RootSlot,
      input: InputSlot
    },
    slotProps: componentsProps,
    fullWidth,
    inputComponent,
    multiline,
    ref,
    type
  }, other, {
    classes
  }));
});
Input.muiName = "Input";
function getFilledInputUtilityClass(slot) {
  return generateUtilityClass$2("MuiFilledInput", slot);
}
const filledInputClasses = _extends({}, inputBaseClasses, generateUtilityClasses("MuiFilledInput", ["root", "underline", "input"]));
const _excluded$1A = ["disableUnderline", "components", "componentsProps", "fullWidth", "hiddenLabel", "inputComponent", "multiline", "slotProps", "slots", "type"];
const useUtilityClasses$1q = (ownerState) => {
  const {
    classes,
    disableUnderline
  } = ownerState;
  const slots = {
    root: ["root", !disableUnderline && "underline"],
    input: ["input"]
  };
  const composedClasses = composeClasses(slots, getFilledInputUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const FilledInputRoot = styled(InputBaseRoot, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiFilledInput",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [...rootOverridesResolver(props, styles2), !ownerState.disableUnderline && styles2.underline];
  }
})(({
  theme,
  ownerState
}) => {
  var _palette;
  const light2 = theme.palette.mode === "light";
  const bottomLineColor = light2 ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.7)";
  const backgroundColor2 = light2 ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.09)";
  const hoverBackground = light2 ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.13)";
  const disabledBackground = light2 ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
  return _extends({
    position: "relative",
    backgroundColor: theme.vars ? theme.vars.palette.FilledInput.bg : backgroundColor2,
    borderTopLeftRadius: (theme.vars || theme).shape.borderRadius,
    borderTopRightRadius: (theme.vars || theme).shape.borderRadius,
    transition: theme.transitions.create("background-color", {
      duration: theme.transitions.duration.shorter,
      easing: theme.transitions.easing.easeOut
    }),
    "&:hover": {
      backgroundColor: theme.vars ? theme.vars.palette.FilledInput.hoverBg : hoverBackground,
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: theme.vars ? theme.vars.palette.FilledInput.bg : backgroundColor2
      }
    },
    [`&.${filledInputClasses.focused}`]: {
      backgroundColor: theme.vars ? theme.vars.palette.FilledInput.bg : backgroundColor2
    },
    [`&.${filledInputClasses.disabled}`]: {
      backgroundColor: theme.vars ? theme.vars.palette.FilledInput.disabledBg : disabledBackground
    }
  }, !ownerState.disableUnderline && {
    "&::after": {
      borderBottom: `2px solid ${(_palette = (theme.vars || theme).palette[ownerState.color || "primary"]) == null ? void 0 : _palette.main}`,
      left: 0,
      bottom: 0,
      // Doing the other way around crash on IE11 "''" https://github.com/cssinjs/jss/issues/242
      content: '""',
      position: "absolute",
      right: 0,
      transform: "scaleX(0)",
      transition: theme.transitions.create("transform", {
        duration: theme.transitions.duration.shorter,
        easing: theme.transitions.easing.easeOut
      }),
      pointerEvents: "none"
      // Transparent to the hover style.
    },
    [`&.${filledInputClasses.focused}:after`]: {
      // translateX(0) is a workaround for Safari transform scale bug
      // See https://github.com/mui/material-ui/issues/31766
      transform: "scaleX(1) translateX(0)"
    },
    [`&.${filledInputClasses.error}`]: {
      "&::before, &::after": {
        borderBottomColor: (theme.vars || theme).palette.error.main
      }
    },
    "&::before": {
      borderBottom: `1px solid ${theme.vars ? `rgba(${theme.vars.palette.common.onBackgroundChannel} / ${theme.vars.opacity.inputUnderline})` : bottomLineColor}`,
      left: 0,
      bottom: 0,
      // Doing the other way around crash on IE11 "''" https://github.com/cssinjs/jss/issues/242
      content: '"\\00a0"',
      position: "absolute",
      right: 0,
      transition: theme.transitions.create("border-bottom-color", {
        duration: theme.transitions.duration.shorter
      }),
      pointerEvents: "none"
      // Transparent to the hover style.
    },
    [`&:hover:not(.${filledInputClasses.disabled}, .${filledInputClasses.error}):before`]: {
      borderBottom: `1px solid ${(theme.vars || theme).palette.text.primary}`
    },
    [`&.${filledInputClasses.disabled}:before`]: {
      borderBottomStyle: "dotted"
    }
  }, ownerState.startAdornment && {
    paddingLeft: 12
  }, ownerState.endAdornment && {
    paddingRight: 12
  }, ownerState.multiline && _extends({
    padding: "25px 12px 8px"
  }, ownerState.size === "small" && {
    paddingTop: 21,
    paddingBottom: 4
  }, ownerState.hiddenLabel && {
    paddingTop: 16,
    paddingBottom: 17
  }, ownerState.hiddenLabel && ownerState.size === "small" && {
    paddingTop: 8,
    paddingBottom: 9
  }));
});
const FilledInputInput = styled(InputBaseComponent, {
  name: "MuiFilledInput",
  slot: "Input",
  overridesResolver: inputOverridesResolver
})(({
  theme,
  ownerState
}) => _extends({
  paddingTop: 25,
  paddingRight: 12,
  paddingBottom: 8,
  paddingLeft: 12
}, !theme.vars && {
  "&:-webkit-autofill": {
    WebkitBoxShadow: theme.palette.mode === "light" ? null : "0 0 0 100px #266798 inset",
    WebkitTextFillColor: theme.palette.mode === "light" ? null : "#fff",
    caretColor: theme.palette.mode === "light" ? null : "#fff",
    borderTopLeftRadius: "inherit",
    borderTopRightRadius: "inherit"
  }
}, theme.vars && {
  "&:-webkit-autofill": {
    borderTopLeftRadius: "inherit",
    borderTopRightRadius: "inherit"
  },
  [theme.getColorSchemeSelector("dark")]: {
    "&:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 100px #266798 inset",
      WebkitTextFillColor: "#fff",
      caretColor: "#fff"
    }
  }
}, ownerState.size === "small" && {
  paddingTop: 21,
  paddingBottom: 4
}, ownerState.hiddenLabel && {
  paddingTop: 16,
  paddingBottom: 17
}, ownerState.startAdornment && {
  paddingLeft: 0
}, ownerState.endAdornment && {
  paddingRight: 0
}, ownerState.hiddenLabel && ownerState.size === "small" && {
  paddingTop: 8,
  paddingBottom: 9
}, ownerState.multiline && {
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0
}));
const FilledInput = /* @__PURE__ */ reactExports.forwardRef(function FilledInput2(inProps, ref) {
  var _ref, _slots$root, _ref2, _slots$input;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFilledInput"
  });
  const {
    components = {},
    componentsProps: componentsPropsProp,
    fullWidth = false,
    // declare here to prevent spreading to DOM
    inputComponent = "input",
    multiline = false,
    slotProps,
    slots = {},
    type = "text"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1A);
  const ownerState = _extends({}, props, {
    fullWidth,
    inputComponent,
    multiline,
    type
  });
  const classes = useUtilityClasses$1q(props);
  const filledInputComponentsProps = {
    root: {
      ownerState
    },
    input: {
      ownerState
    }
  };
  const componentsProps = (slotProps != null ? slotProps : componentsPropsProp) ? deepmerge$1(filledInputComponentsProps, slotProps != null ? slotProps : componentsPropsProp) : filledInputComponentsProps;
  const RootSlot = (_ref = (_slots$root = slots.root) != null ? _slots$root : components.Root) != null ? _ref : FilledInputRoot;
  const InputSlot = (_ref2 = (_slots$input = slots.input) != null ? _slots$input : components.Input) != null ? _ref2 : FilledInputInput;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InputBase, _extends({
    slots: {
      root: RootSlot,
      input: InputSlot
    },
    componentsProps,
    fullWidth,
    inputComponent,
    multiline,
    ref,
    type
  }, other, {
    classes
  }));
});
FilledInput.muiName = "Input";
var _span$3;
const _excluded$1z = ["children", "classes", "className", "label", "notched"];
const NotchedOutlineRoot$1 = styled("fieldset", {
  shouldForwardProp: rootShouldForwardProp
})({
  textAlign: "left",
  position: "absolute",
  bottom: 0,
  right: 0,
  top: -5,
  left: 0,
  margin: 0,
  padding: "0 8px",
  pointerEvents: "none",
  borderRadius: "inherit",
  borderStyle: "solid",
  borderWidth: 1,
  overflow: "hidden",
  minWidth: "0%"
});
const NotchedOutlineLegend = styled("legend", {
  shouldForwardProp: rootShouldForwardProp
})(({
  ownerState,
  theme
}) => _extends({
  float: "unset",
  // Fix conflict with bootstrap
  width: "auto",
  // Fix conflict with bootstrap
  overflow: "hidden"
}, !ownerState.withLabel && {
  padding: 0,
  lineHeight: "11px",
  // sync with `height` in `legend` styles
  transition: theme.transitions.create("width", {
    duration: 150,
    easing: theme.transitions.easing.easeOut
  })
}, ownerState.withLabel && _extends({
  display: "block",
  // Fix conflict with normalize.css and sanitize.css
  padding: 0,
  height: 11,
  // sync with `lineHeight` in `legend` styles
  fontSize: "0.75em",
  visibility: "hidden",
  maxWidth: 0.01,
  transition: theme.transitions.create("max-width", {
    duration: 50,
    easing: theme.transitions.easing.easeOut
  }),
  whiteSpace: "nowrap",
  "& > span": {
    paddingLeft: 5,
    paddingRight: 5,
    display: "inline-block",
    opacity: 0,
    visibility: "visible"
  }
}, ownerState.notched && {
  maxWidth: "100%",
  transition: theme.transitions.create("max-width", {
    duration: 100,
    easing: theme.transitions.easing.easeOut,
    delay: 50
  })
})));
function NotchedOutline(props) {
  const {
    className,
    label,
    notched
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1z);
  const withLabel = label != null && label !== "";
  const ownerState = _extends({}, props, {
    notched,
    withLabel
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(NotchedOutlineRoot$1, _extends({
    "aria-hidden": true,
    className,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(NotchedOutlineLegend, {
      ownerState,
      children: withLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        children: label
      }) : (
        // notranslate needed while Google Translate will not fix zero-width space issue
        _span$3 || (_span$3 = /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "notranslate",
          children: "​"
        }))
      )
    })
  }));
}
function getOutlinedInputUtilityClass(slot) {
  return generateUtilityClass$2("MuiOutlinedInput", slot);
}
const outlinedInputClasses = _extends({}, inputBaseClasses, generateUtilityClasses("MuiOutlinedInput", ["root", "notchedOutline", "input"]));
const _excluded$1y = ["components", "fullWidth", "inputComponent", "label", "multiline", "notched", "slots", "type"];
const useUtilityClasses$1p = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    notchedOutline: ["notchedOutline"],
    input: ["input"]
  };
  const composedClasses = composeClasses(slots, getOutlinedInputUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const OutlinedInputRoot = styled(InputBaseRoot, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiOutlinedInput",
  slot: "Root",
  overridesResolver: rootOverridesResolver
})(({
  theme,
  ownerState
}) => {
  const borderColor2 = theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
  return _extends({
    position: "relative",
    borderRadius: (theme.vars || theme).shape.borderRadius,
    [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
      borderColor: (theme.vars || theme).palette.text.primary
    },
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
        borderColor: theme.vars ? `rgba(${theme.vars.palette.common.onBackgroundChannel} / 0.23)` : borderColor2
      }
    },
    [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]: {
      borderColor: (theme.vars || theme).palette[ownerState.color].main,
      borderWidth: 2
    },
    [`&.${outlinedInputClasses.error} .${outlinedInputClasses.notchedOutline}`]: {
      borderColor: (theme.vars || theme).palette.error.main
    },
    [`&.${outlinedInputClasses.disabled} .${outlinedInputClasses.notchedOutline}`]: {
      borderColor: (theme.vars || theme).palette.action.disabled
    }
  }, ownerState.startAdornment && {
    paddingLeft: 14
  }, ownerState.endAdornment && {
    paddingRight: 14
  }, ownerState.multiline && _extends({
    padding: "16.5px 14px"
  }, ownerState.size === "small" && {
    padding: "8.5px 14px"
  }));
});
const NotchedOutlineRoot = styled(NotchedOutline, {
  name: "MuiOutlinedInput",
  slot: "NotchedOutline",
  overridesResolver: (props, styles2) => styles2.notchedOutline
})(({
  theme
}) => {
  const borderColor2 = theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)";
  return {
    borderColor: theme.vars ? `rgba(${theme.vars.palette.common.onBackgroundChannel} / 0.23)` : borderColor2
  };
});
const OutlinedInputInput = styled(InputBaseComponent, {
  name: "MuiOutlinedInput",
  slot: "Input",
  overridesResolver: inputOverridesResolver
})(({
  theme,
  ownerState
}) => _extends({
  padding: "16.5px 14px"
}, !theme.vars && {
  "&:-webkit-autofill": {
    WebkitBoxShadow: theme.palette.mode === "light" ? null : "0 0 0 100px #266798 inset",
    WebkitTextFillColor: theme.palette.mode === "light" ? null : "#fff",
    caretColor: theme.palette.mode === "light" ? null : "#fff",
    borderRadius: "inherit"
  }
}, theme.vars && {
  "&:-webkit-autofill": {
    borderRadius: "inherit"
  },
  [theme.getColorSchemeSelector("dark")]: {
    "&:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 100px #266798 inset",
      WebkitTextFillColor: "#fff",
      caretColor: "#fff"
    }
  }
}, ownerState.size === "small" && {
  padding: "8.5px 14px"
}, ownerState.multiline && {
  padding: 0
}, ownerState.startAdornment && {
  paddingLeft: 0
}, ownerState.endAdornment && {
  paddingRight: 0
}));
const OutlinedInput = /* @__PURE__ */ reactExports.forwardRef(function OutlinedInput2(inProps, ref) {
  var _ref, _slots$root, _ref2, _slots$input, _React$Fragment;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiOutlinedInput"
  });
  const {
    components = {},
    fullWidth = false,
    inputComponent = "input",
    label,
    multiline = false,
    notched,
    slots = {},
    type = "text"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1y);
  const classes = useUtilityClasses$1p(props);
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["color", "disabled", "error", "focused", "hiddenLabel", "size", "required"]
  });
  const ownerState = _extends({}, props, {
    color: fcs.color || "primary",
    disabled: fcs.disabled,
    error: fcs.error,
    focused: fcs.focused,
    formControl: muiFormControl,
    fullWidth,
    hiddenLabel: fcs.hiddenLabel,
    multiline,
    size: fcs.size,
    type
  });
  const RootSlot = (_ref = (_slots$root = slots.root) != null ? _slots$root : components.Root) != null ? _ref : OutlinedInputRoot;
  const InputSlot = (_ref2 = (_slots$input = slots.input) != null ? _slots$input : components.Input) != null ? _ref2 : OutlinedInputInput;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InputBase, _extends({
    slots: {
      root: RootSlot,
      input: InputSlot
    },
    renderSuffix: (state) => /* @__PURE__ */ jsxRuntimeExports.jsx(NotchedOutlineRoot, {
      ownerState,
      className: classes.notchedOutline,
      label: label != null && label !== "" && fcs.required ? _React$Fragment || (_React$Fragment = /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
        children: [label, " ", "*"]
      })) : label,
      notched: typeof notched !== "undefined" ? notched : Boolean(state.startAdornment || state.filled || state.focused)
    }),
    fullWidth,
    inputComponent,
    multiline,
    ref,
    type
  }, other, {
    classes: _extends({}, classes, {
      notchedOutline: null
    })
  }));
});
OutlinedInput.muiName = "Input";
function getFormLabelUtilityClasses(slot) {
  return generateUtilityClass$2("MuiFormLabel", slot);
}
const formLabelClasses = generateUtilityClasses("MuiFormLabel", ["root", "colorSecondary", "focused", "disabled", "error", "filled", "required", "asterisk"]);
const _excluded$1x = ["children", "className", "color", "component", "disabled", "error", "filled", "focused", "required"];
const useUtilityClasses$1o = (ownerState) => {
  const {
    classes,
    color: color2,
    focused,
    disabled,
    error,
    filled,
    required
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2)}`, disabled && "disabled", error && "error", filled && "filled", focused && "focused", required && "required"],
    asterisk: ["asterisk", error && "error"]
  };
  return composeClasses(slots, getFormLabelUtilityClasses, classes);
};
const FormLabelRoot = styled("label", {
  name: "MuiFormLabel",
  slot: "Root",
  overridesResolver: ({
    ownerState
  }, styles2) => {
    return _extends({}, styles2.root, ownerState.color === "secondary" && styles2.colorSecondary, ownerState.filled && styles2.filled);
  }
})(({
  theme,
  ownerState
}) => _extends({
  color: (theme.vars || theme).palette.text.secondary
}, theme.typography.body1, {
  lineHeight: "1.4375em",
  padding: 0,
  position: "relative",
  [`&.${formLabelClasses.focused}`]: {
    color: (theme.vars || theme).palette[ownerState.color].main
  },
  [`&.${formLabelClasses.disabled}`]: {
    color: (theme.vars || theme).palette.text.disabled
  },
  [`&.${formLabelClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}));
const AsteriskComponent$1 = styled("span", {
  name: "MuiFormLabel",
  slot: "Asterisk",
  overridesResolver: (props, styles2) => styles2.asterisk
})(({
  theme
}) => ({
  [`&.${formLabelClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}));
const FormLabel = /* @__PURE__ */ reactExports.forwardRef(function FormLabel2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFormLabel"
  });
  const {
    children,
    className,
    component = "label"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1x);
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["color", "required", "focused", "disabled", "error", "filled"]
  });
  const ownerState = _extends({}, props, {
    color: fcs.color || "primary",
    component,
    disabled: fcs.disabled,
    error: fcs.error,
    filled: fcs.filled,
    focused: fcs.focused,
    required: fcs.required
  });
  const classes = useUtilityClasses$1o(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormLabelRoot, _extends({
    as: component,
    ownerState,
    className: clsx(classes.root, className),
    ref
  }, other, {
    children: [children, fcs.required && /* @__PURE__ */ jsxRuntimeExports.jsxs(AsteriskComponent$1, {
      ownerState,
      "aria-hidden": true,
      className: classes.asterisk,
      children: [" ", "*"]
    })]
  }));
});
function getInputLabelUtilityClasses(slot) {
  return generateUtilityClass$2("MuiInputLabel", slot);
}
generateUtilityClasses("MuiInputLabel", ["root", "focused", "disabled", "error", "required", "asterisk", "formControl", "sizeSmall", "shrink", "animated", "standard", "filled", "outlined"]);
const _excluded$1w = ["disableAnimation", "margin", "shrink", "variant", "className"];
const useUtilityClasses$1n = (ownerState) => {
  const {
    classes,
    formControl,
    size,
    shrink,
    disableAnimation,
    variant,
    required
  } = ownerState;
  const slots = {
    root: ["root", formControl && "formControl", !disableAnimation && "animated", shrink && "shrink", size && size !== "normal" && `size${capitalize$1(size)}`, variant],
    asterisk: [required && "asterisk"]
  };
  const composedClasses = composeClasses(slots, getInputLabelUtilityClasses, classes);
  return _extends({}, classes, composedClasses);
};
const InputLabelRoot = styled(FormLabel, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiInputLabel",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${formLabelClasses.asterisk}`]: styles2.asterisk
    }, styles2.root, ownerState.formControl && styles2.formControl, ownerState.size === "small" && styles2.sizeSmall, ownerState.shrink && styles2.shrink, !ownerState.disableAnimation && styles2.animated, ownerState.focused && styles2.focused, styles2[ownerState.variant]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "block",
  transformOrigin: "top left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%"
}, ownerState.formControl && {
  position: "absolute",
  left: 0,
  top: 0,
  // slight alteration to spec spacing to match visual spec result
  transform: "translate(0, 20px) scale(1)"
}, ownerState.size === "small" && {
  // Compensation for the `Input.inputSizeSmall` style.
  transform: "translate(0, 17px) scale(1)"
}, ownerState.shrink && {
  transform: "translate(0, -1.5px) scale(0.75)",
  transformOrigin: "top left",
  maxWidth: "133%"
}, !ownerState.disableAnimation && {
  transition: theme.transitions.create(["color", "transform", "max-width"], {
    duration: theme.transitions.duration.shorter,
    easing: theme.transitions.easing.easeOut
  })
}, ownerState.variant === "filled" && _extends({
  // Chrome's autofill feature gives the input field a yellow background.
  // Since the input field is behind the label in the HTML tree,
  // the input field is drawn last and hides the label with an opaque background color.
  // zIndex: 1 will raise the label above opaque background-colors of input.
  zIndex: 1,
  pointerEvents: "none",
  transform: "translate(12px, 16px) scale(1)",
  maxWidth: "calc(100% - 24px)"
}, ownerState.size === "small" && {
  transform: "translate(12px, 13px) scale(1)"
}, ownerState.shrink && _extends({
  userSelect: "none",
  pointerEvents: "auto",
  transform: "translate(12px, 7px) scale(0.75)",
  maxWidth: "calc(133% - 24px)"
}, ownerState.size === "small" && {
  transform: "translate(12px, 4px) scale(0.75)"
})), ownerState.variant === "outlined" && _extends({
  // see comment above on filled.zIndex
  zIndex: 1,
  pointerEvents: "none",
  transform: "translate(14px, 16px) scale(1)",
  maxWidth: "calc(100% - 24px)"
}, ownerState.size === "small" && {
  transform: "translate(14px, 9px) scale(1)"
}, ownerState.shrink && {
  userSelect: "none",
  pointerEvents: "auto",
  // Theoretically, we should have (8+5)*2/0.75 = 34px
  // but it feels a better when it bleeds a bit on the left, so 32px.
  maxWidth: "calc(133% - 32px)",
  transform: "translate(14px, -9px) scale(0.75)"
})));
const InputLabel = /* @__PURE__ */ reactExports.forwardRef(function InputLabel2(inProps, ref) {
  const props = useThemeProps$a({
    name: "MuiInputLabel",
    props: inProps
  });
  const {
    disableAnimation = false,
    shrink: shrinkProp,
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1w);
  const muiFormControl = useFormControl();
  let shrink = shrinkProp;
  if (typeof shrink === "undefined" && muiFormControl) {
    shrink = muiFormControl.filled || muiFormControl.focused || muiFormControl.adornedStart;
  }
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["size", "variant", "required", "focused"]
  });
  const ownerState = _extends({}, props, {
    disableAnimation,
    formControl: muiFormControl,
    shrink,
    size: fcs.size,
    variant: fcs.variant,
    required: fcs.required,
    focused: fcs.focused
  });
  const classes = useUtilityClasses$1n(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabelRoot, _extends({
    "data-shrink": shrink,
    ownerState,
    ref,
    className: clsx(classes.root, className)
  }, other, {
    classes
  }));
});
function getFormControlUtilityClasses(slot) {
  return generateUtilityClass$2("MuiFormControl", slot);
}
generateUtilityClasses("MuiFormControl", ["root", "marginNone", "marginNormal", "marginDense", "fullWidth", "disabled"]);
const _excluded$1v = ["children", "className", "color", "component", "disabled", "error", "focused", "fullWidth", "hiddenLabel", "margin", "required", "size", "variant"];
const useUtilityClasses$1m = (ownerState) => {
  const {
    classes,
    margin: margin2,
    fullWidth
  } = ownerState;
  const slots = {
    root: ["root", margin2 !== "none" && `margin${capitalize$1(margin2)}`, fullWidth && "fullWidth"]
  };
  return composeClasses(slots, getFormControlUtilityClasses, classes);
};
const FormControlRoot = styled("div", {
  name: "MuiFormControl",
  slot: "Root",
  overridesResolver: ({
    ownerState
  }, styles2) => {
    return _extends({}, styles2.root, styles2[`margin${capitalize$1(ownerState.margin)}`], ownerState.fullWidth && styles2.fullWidth);
  }
})(({
  ownerState
}) => _extends({
  display: "inline-flex",
  flexDirection: "column",
  position: "relative",
  // Reset fieldset default style.
  minWidth: 0,
  padding: 0,
  margin: 0,
  border: 0,
  verticalAlign: "top"
}, ownerState.margin === "normal" && {
  marginTop: 16,
  marginBottom: 8
}, ownerState.margin === "dense" && {
  marginTop: 8,
  marginBottom: 4
}, ownerState.fullWidth && {
  width: "100%"
}));
const FormControl = /* @__PURE__ */ reactExports.forwardRef(function FormControl2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFormControl"
  });
  const {
    children,
    className,
    color: color2 = "primary",
    component = "div",
    disabled = false,
    error = false,
    focused: visuallyFocused,
    fullWidth = false,
    hiddenLabel = false,
    margin: margin2 = "none",
    required = false,
    size = "medium",
    variant = "outlined"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1v);
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    disabled,
    error,
    fullWidth,
    hiddenLabel,
    margin: margin2,
    required,
    size,
    variant
  });
  const classes = useUtilityClasses$1m(ownerState);
  const [adornedStart, setAdornedStart] = reactExports.useState(() => {
    let initialAdornedStart = false;
    if (children) {
      reactExports.Children.forEach(children, (child) => {
        if (!isMuiElement(child, ["Input", "Select"])) {
          return;
        }
        const input = isMuiElement(child, ["Select"]) ? child.props.input : child;
        if (input && isAdornedStart(input.props)) {
          initialAdornedStart = true;
        }
      });
    }
    return initialAdornedStart;
  });
  const [filled, setFilled] = reactExports.useState(() => {
    let initialFilled = false;
    if (children) {
      reactExports.Children.forEach(children, (child) => {
        if (!isMuiElement(child, ["Input", "Select"])) {
          return;
        }
        if (isFilled(child.props, true) || isFilled(child.props.inputProps, true)) {
          initialFilled = true;
        }
      });
    }
    return initialFilled;
  });
  const [focusedState, setFocused] = reactExports.useState(false);
  if (disabled && focusedState) {
    setFocused(false);
  }
  const focused = visuallyFocused !== void 0 && !disabled ? visuallyFocused : focusedState;
  let registerEffect;
  const childContext = reactExports.useMemo(() => {
    return {
      adornedStart,
      setAdornedStart,
      color: color2,
      disabled,
      error,
      filled,
      focused,
      fullWidth,
      hiddenLabel,
      size,
      onBlur: () => {
        setFocused(false);
      },
      onEmpty: () => {
        setFilled(false);
      },
      onFilled: () => {
        setFilled(true);
      },
      onFocus: () => {
        setFocused(true);
      },
      registerEffect,
      required,
      variant
    };
  }, [adornedStart, color2, disabled, error, filled, focused, fullWidth, hiddenLabel, registerEffect, required, size, variant]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlContext.Provider, {
    value: childContext,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlRoot, _extends({
      as: component,
      ownerState,
      className: clsx(classes.root, className),
      ref
    }, other, {
      children
    }))
  });
});
function getFormHelperTextUtilityClasses(slot) {
  return generateUtilityClass$2("MuiFormHelperText", slot);
}
const formHelperTextClasses = generateUtilityClasses("MuiFormHelperText", ["root", "error", "disabled", "sizeSmall", "sizeMedium", "contained", "focused", "filled", "required"]);
var _span$2;
const _excluded$1u = ["children", "className", "component", "disabled", "error", "filled", "focused", "margin", "required", "variant"];
const useUtilityClasses$1l = (ownerState) => {
  const {
    classes,
    contained,
    size,
    disabled,
    error,
    filled,
    focused,
    required
  } = ownerState;
  const slots = {
    root: ["root", disabled && "disabled", error && "error", size && `size${capitalize$1(size)}`, contained && "contained", focused && "focused", filled && "filled", required && "required"]
  };
  return composeClasses(slots, getFormHelperTextUtilityClasses, classes);
};
const FormHelperTextRoot = styled("p", {
  name: "MuiFormHelperText",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.size && styles2[`size${capitalize$1(ownerState.size)}`], ownerState.contained && styles2.contained, ownerState.filled && styles2.filled];
  }
})(({
  theme,
  ownerState
}) => _extends({
  color: (theme.vars || theme).palette.text.secondary
}, theme.typography.caption, {
  textAlign: "left",
  marginTop: 3,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  [`&.${formHelperTextClasses.disabled}`]: {
    color: (theme.vars || theme).palette.text.disabled
  },
  [`&.${formHelperTextClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}, ownerState.size === "small" && {
  marginTop: 4
}, ownerState.contained && {
  marginLeft: 14,
  marginRight: 14
}));
const FormHelperText = /* @__PURE__ */ reactExports.forwardRef(function FormHelperText2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFormHelperText"
  });
  const {
    children,
    className,
    component = "p"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1u);
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["variant", "size", "disabled", "error", "filled", "focused", "required"]
  });
  const ownerState = _extends({}, props, {
    component,
    contained: fcs.variant === "filled" || fcs.variant === "outlined",
    variant: fcs.variant,
    size: fcs.size,
    disabled: fcs.disabled,
    error: fcs.error,
    filled: fcs.filled,
    focused: fcs.focused,
    required: fcs.required
  });
  const classes = useUtilityClasses$1l(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormHelperTextRoot, _extends({
    as: component,
    ownerState,
    className: clsx(classes.root, className),
    ref
  }, other, {
    children: children === " " ? (
      // notranslate needed while Google Translate will not fix zero-width space issue
      _span$2 || (_span$2 = /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "notranslate",
        children: "​"
      }))
    ) : children
  }));
});
const reflow = (node) => node.scrollTop;
function getTransitionProps(props, options) {
  var _style$transitionDura, _style$transitionTimi;
  const {
    timeout,
    easing: easing2,
    style: style2 = {}
  } = props;
  return {
    duration: (_style$transitionDura = style2.transitionDuration) != null ? _style$transitionDura : typeof timeout === "number" ? timeout : timeout[options.mode] || 0,
    easing: (_style$transitionTimi = style2.transitionTimingFunction) != null ? _style$transitionTimi : typeof easing2 === "object" ? easing2[options.mode] : easing2,
    delay: style2.transitionDelay
  };
}
const _excluded$1t = ["addEndListener", "appear", "children", "easing", "in", "onEnter", "onEntered", "onEntering", "onExit", "onExited", "onExiting", "style", "timeout", "TransitionComponent"];
function getScale(value) {
  return `scale(${value}, ${value ** 2})`;
}
const styles$4 = {
  entering: {
    opacity: 1,
    transform: getScale(1)
  },
  entered: {
    opacity: 1,
    transform: "none"
  }
};
const isWebKit154 = typeof navigator !== "undefined" && /^((?!chrome|android).)*(safari|mobile)/i.test(navigator.userAgent) && /(os |version\/)15(.|_)4/i.test(navigator.userAgent);
const Grow = /* @__PURE__ */ reactExports.forwardRef(function Grow2(props, ref) {
  const {
    addEndListener,
    appear = true,
    children,
    easing: easing2,
    in: inProp,
    onEnter,
    onEntered,
    onEntering,
    onExit,
    onExited,
    onExiting,
    style: style2,
    timeout = "auto",
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Transition
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1t);
  const timer = useTimeout();
  const autoTimeout = reactExports.useRef();
  const theme = useTheme$1();
  const nodeRef = reactExports.useRef(null);
  const handleRef = useForkRef(nodeRef, children.ref, ref);
  const normalizedTransitionCallback = (callback) => (maybeIsAppearing) => {
    if (callback) {
      const node = nodeRef.current;
      if (maybeIsAppearing === void 0) {
        callback(node);
      } else {
        callback(node, maybeIsAppearing);
      }
    }
  };
  const handleEntering = normalizedTransitionCallback(onEntering);
  const handleEnter = normalizedTransitionCallback((node, isAppearing) => {
    reflow(node);
    const {
      duration: transitionDuration,
      delay,
      easing: transitionTimingFunction
    } = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "enter"
    });
    let duration2;
    if (timeout === "auto") {
      duration2 = theme.transitions.getAutoHeightDuration(node.clientHeight);
      autoTimeout.current = duration2;
    } else {
      duration2 = transitionDuration;
    }
    node.style.transition = [theme.transitions.create("opacity", {
      duration: duration2,
      delay
    }), theme.transitions.create("transform", {
      duration: isWebKit154 ? duration2 : duration2 * 0.666,
      delay,
      easing: transitionTimingFunction
    })].join(",");
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  });
  const handleEntered = normalizedTransitionCallback(onEntered);
  const handleExiting = normalizedTransitionCallback(onExiting);
  const handleExit = normalizedTransitionCallback((node) => {
    const {
      duration: transitionDuration,
      delay,
      easing: transitionTimingFunction
    } = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "exit"
    });
    let duration2;
    if (timeout === "auto") {
      duration2 = theme.transitions.getAutoHeightDuration(node.clientHeight);
      autoTimeout.current = duration2;
    } else {
      duration2 = transitionDuration;
    }
    node.style.transition = [theme.transitions.create("opacity", {
      duration: duration2,
      delay
    }), theme.transitions.create("transform", {
      duration: isWebKit154 ? duration2 : duration2 * 0.666,
      delay: isWebKit154 ? delay : delay || duration2 * 0.333,
      easing: transitionTimingFunction
    })].join(",");
    node.style.opacity = 0;
    node.style.transform = getScale(0.75);
    if (onExit) {
      onExit(node);
    }
  });
  const handleExited = normalizedTransitionCallback(onExited);
  const handleAddEndListener = (next2) => {
    if (timeout === "auto") {
      timer.start(autoTimeout.current || 0, next2);
    }
    if (addEndListener) {
      addEndListener(nodeRef.current, next2);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    appear,
    in: inProp,
    nodeRef,
    onEnter: handleEnter,
    onEntered: handleEntered,
    onEntering: handleEntering,
    onExit: handleExit,
    onExited: handleExited,
    onExiting: handleExiting,
    addEndListener: handleAddEndListener,
    timeout: timeout === "auto" ? null : timeout
  }, other, {
    children: (state, childProps) => {
      return /* @__PURE__ */ reactExports.cloneElement(children, _extends({
        style: _extends({
          opacity: 0,
          transform: getScale(0.75),
          visibility: state === "exited" && !inProp ? "hidden" : void 0
        }, styles$4[state], style2, children.props.style),
        ref: handleRef
      }, childProps));
    }
  }));
});
Grow.muiSupportAuto = true;
const _excluded$1s = ["addEndListener", "appear", "children", "easing", "in", "onEnter", "onEntered", "onEntering", "onExit", "onExited", "onExiting", "style", "timeout", "TransitionComponent"];
const styles$3 = {
  entering: {
    opacity: 1
  },
  entered: {
    opacity: 1
  }
};
const Fade = /* @__PURE__ */ reactExports.forwardRef(function Fade2(props, ref) {
  const theme = useTheme$1();
  const defaultTimeout = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    addEndListener,
    appear = true,
    children,
    easing: easing2,
    in: inProp,
    onEnter,
    onEntered,
    onEntering,
    onExit,
    onExited,
    onExiting,
    style: style2,
    timeout = defaultTimeout,
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Transition
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1s);
  const nodeRef = reactExports.useRef(null);
  const handleRef = useForkRef(nodeRef, children.ref, ref);
  const normalizedTransitionCallback = (callback) => (maybeIsAppearing) => {
    if (callback) {
      const node = nodeRef.current;
      if (maybeIsAppearing === void 0) {
        callback(node);
      } else {
        callback(node, maybeIsAppearing);
      }
    }
  };
  const handleEntering = normalizedTransitionCallback(onEntering);
  const handleEnter = normalizedTransitionCallback((node, isAppearing) => {
    reflow(node);
    const transitionProps = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "enter"
    });
    node.style.webkitTransition = theme.transitions.create("opacity", transitionProps);
    node.style.transition = theme.transitions.create("opacity", transitionProps);
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  });
  const handleEntered = normalizedTransitionCallback(onEntered);
  const handleExiting = normalizedTransitionCallback(onExiting);
  const handleExit = normalizedTransitionCallback((node) => {
    const transitionProps = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "exit"
    });
    node.style.webkitTransition = theme.transitions.create("opacity", transitionProps);
    node.style.transition = theme.transitions.create("opacity", transitionProps);
    if (onExit) {
      onExit(node);
    }
  });
  const handleExited = normalizedTransitionCallback(onExited);
  const handleAddEndListener = (next2) => {
    if (addEndListener) {
      addEndListener(nodeRef.current, next2);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    appear,
    in: inProp,
    nodeRef,
    onEnter: handleEnter,
    onEntered: handleEntered,
    onEntering: handleEntering,
    onExit: handleExit,
    onExited: handleExited,
    onExiting: handleExiting,
    addEndListener: handleAddEndListener,
    timeout
  }, other, {
    children: (state, childProps) => {
      return /* @__PURE__ */ reactExports.cloneElement(children, _extends({
        style: _extends({
          opacity: 0,
          visibility: state === "exited" && !inProp ? "hidden" : void 0
        }, styles$3[state], style2, children.props.style),
        ref: handleRef
      }, childProps));
    }
  }));
});
function getBackdropUtilityClass(slot) {
  return generateUtilityClass$2("MuiBackdrop", slot);
}
generateUtilityClasses("MuiBackdrop", ["root", "invisible"]);
const _excluded$1r = ["children", "className", "component", "components", "componentsProps", "invisible", "open", "slotProps", "slots", "TransitionComponent", "transitionDuration"];
const useUtilityClasses$1k = (ownerState) => {
  const {
    classes,
    invisible
  } = ownerState;
  const slots = {
    root: ["root", invisible && "invisible"]
  };
  return composeClasses(slots, getBackdropUtilityClass, classes);
};
const BackdropRoot = styled("div", {
  name: "MuiBackdrop",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.invisible && styles2.invisible];
  }
})(({
  ownerState
}) => _extends({
  position: "fixed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  right: 0,
  bottom: 0,
  top: 0,
  left: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  WebkitTapHighlightColor: "transparent"
}, ownerState.invisible && {
  backgroundColor: "transparent"
}));
const Backdrop = /* @__PURE__ */ reactExports.forwardRef(function Backdrop2(inProps, ref) {
  var _slotProps$root, _ref, _slots$root;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiBackdrop"
  });
  const {
    children,
    className,
    component = "div",
    components = {},
    componentsProps = {},
    invisible = false,
    open,
    slotProps = {},
    slots = {},
    TransitionComponent = Fade,
    transitionDuration
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1r);
  const ownerState = _extends({}, props, {
    component,
    invisible
  });
  const classes = useUtilityClasses$1k(ownerState);
  const rootSlotProps = (_slotProps$root = slotProps.root) != null ? _slotProps$root : componentsProps.root;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    in: open,
    timeout: transitionDuration
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackdropRoot, _extends({
      "aria-hidden": true
    }, rootSlotProps, {
      as: (_ref = (_slots$root = slots.root) != null ? _slots$root : components.Root) != null ? _ref : component,
      className: clsx(classes.root, className, rootSlotProps == null ? void 0 : rootSlotProps.className),
      ownerState: _extends({}, ownerState, rootSlotProps == null ? void 0 : rootSlotProps.ownerState),
      classes,
      ref,
      children
    }))
  }));
});
function getModalUtilityClass(slot) {
  return generateUtilityClass$2("MuiModal", slot);
}
generateUtilityClasses("MuiModal", ["root", "hidden", "backdrop"]);
const _excluded$1q = ["BackdropComponent", "BackdropProps", "classes", "className", "closeAfterTransition", "children", "container", "component", "components", "componentsProps", "disableAutoFocus", "disableEnforceFocus", "disableEscapeKeyDown", "disablePortal", "disableRestoreFocus", "disableScrollLock", "hideBackdrop", "keepMounted", "onBackdropClick", "onClose", "onTransitionEnter", "onTransitionExited", "open", "slotProps", "slots", "theme"];
const useUtilityClasses$1j = (ownerState) => {
  const {
    open,
    exited,
    classes
  } = ownerState;
  const slots = {
    root: ["root", !open && exited && "hidden"],
    backdrop: ["backdrop"]
  };
  return composeClasses(slots, getModalUtilityClass, classes);
};
const ModalRoot = styled("div", {
  name: "MuiModal",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, !ownerState.open && ownerState.exited && styles2.hidden];
  }
})(({
  theme,
  ownerState
}) => _extends({
  position: "fixed",
  zIndex: (theme.vars || theme).zIndex.modal,
  right: 0,
  bottom: 0,
  top: 0,
  left: 0
}, !ownerState.open && ownerState.exited && {
  visibility: "hidden"
}));
const ModalBackdrop = styled(Backdrop, {
  name: "MuiModal",
  slot: "Backdrop",
  overridesResolver: (props, styles2) => {
    return styles2.backdrop;
  }
})({
  zIndex: -1
});
const Modal = /* @__PURE__ */ reactExports.forwardRef(function Modal2(inProps, ref) {
  var _ref, _slots$root, _ref2, _slots$backdrop, _slotProps$root, _slotProps$backdrop;
  const props = useThemeProps$a({
    name: "MuiModal",
    props: inProps
  });
  const {
    BackdropComponent = ModalBackdrop,
    BackdropProps,
    className,
    closeAfterTransition = false,
    children,
    container,
    component,
    components = {},
    componentsProps = {},
    disableAutoFocus = false,
    disableEnforceFocus = false,
    disableEscapeKeyDown = false,
    disablePortal = false,
    disableRestoreFocus = false,
    disableScrollLock = false,
    hideBackdrop = false,
    keepMounted = false,
    onBackdropClick,
    open,
    slotProps,
    slots
    // eslint-disable-next-line react/prop-types
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1q);
  const propsWithDefaults = _extends({}, props, {
    closeAfterTransition,
    disableAutoFocus,
    disableEnforceFocus,
    disableEscapeKeyDown,
    disablePortal,
    disableRestoreFocus,
    disableScrollLock,
    hideBackdrop,
    keepMounted
  });
  const {
    getRootProps,
    getBackdropProps,
    getTransitionProps: getTransitionProps2,
    portalRef,
    isTopModal,
    exited,
    hasTransition
  } = useModal(_extends({}, propsWithDefaults, {
    rootRef: ref
  }));
  const ownerState = _extends({}, propsWithDefaults, {
    exited
  });
  const classes = useUtilityClasses$1j(ownerState);
  const childProps = {};
  if (children.props.tabIndex === void 0) {
    childProps.tabIndex = "-1";
  }
  if (hasTransition) {
    const {
      onEnter,
      onExited
    } = getTransitionProps2();
    childProps.onEnter = onEnter;
    childProps.onExited = onExited;
  }
  const RootSlot = (_ref = (_slots$root = slots == null ? void 0 : slots.root) != null ? _slots$root : components.Root) != null ? _ref : ModalRoot;
  const BackdropSlot = (_ref2 = (_slots$backdrop = slots == null ? void 0 : slots.backdrop) != null ? _slots$backdrop : components.Backdrop) != null ? _ref2 : BackdropComponent;
  const rootSlotProps = (_slotProps$root = slotProps == null ? void 0 : slotProps.root) != null ? _slotProps$root : componentsProps.root;
  const backdropSlotProps = (_slotProps$backdrop = slotProps == null ? void 0 : slotProps.backdrop) != null ? _slotProps$backdrop : componentsProps.backdrop;
  const rootProps = useSlotProps({
    elementType: RootSlot,
    externalSlotProps: rootSlotProps,
    externalForwardedProps: other,
    getSlotProps: getRootProps,
    additionalProps: {
      ref,
      as: component
    },
    ownerState,
    className: clsx(className, rootSlotProps == null ? void 0 : rootSlotProps.className, classes == null ? void 0 : classes.root, !ownerState.open && ownerState.exited && (classes == null ? void 0 : classes.hidden))
  });
  const backdropProps = useSlotProps({
    elementType: BackdropSlot,
    externalSlotProps: backdropSlotProps,
    additionalProps: BackdropProps,
    getSlotProps: (otherHandlers) => {
      return getBackdropProps(_extends({}, otherHandlers, {
        onClick: (e2) => {
          if (onBackdropClick) {
            onBackdropClick(e2);
          }
          if (otherHandlers != null && otherHandlers.onClick) {
            otherHandlers.onClick(e2);
          }
        }
      }));
    },
    className: clsx(backdropSlotProps == null ? void 0 : backdropSlotProps.className, BackdropProps == null ? void 0 : BackdropProps.className, classes == null ? void 0 : classes.backdrop),
    ownerState
  });
  if (!keepMounted && !open && (!hasTransition || exited)) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, {
    ref: portalRef,
    container,
    disablePortal,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(RootSlot, _extends({}, rootProps, {
      children: [!hideBackdrop && BackdropComponent ? /* @__PURE__ */ jsxRuntimeExports.jsx(BackdropSlot, _extends({}, backdropProps)) : null, /* @__PURE__ */ jsxRuntimeExports.jsx(FocusTrap, {
        disableEnforceFocus,
        disableAutoFocus,
        disableRestoreFocus,
        isEnabled: isTopModal,
        open,
        children: /* @__PURE__ */ reactExports.cloneElement(children, childProps)
      })]
    }))
  });
});
function getPaperUtilityClass(slot) {
  return generateUtilityClass$2("MuiPaper", slot);
}
generateUtilityClasses("MuiPaper", ["root", "rounded", "outlined", "elevation", "elevation0", "elevation1", "elevation2", "elevation3", "elevation4", "elevation5", "elevation6", "elevation7", "elevation8", "elevation9", "elevation10", "elevation11", "elevation12", "elevation13", "elevation14", "elevation15", "elevation16", "elevation17", "elevation18", "elevation19", "elevation20", "elevation21", "elevation22", "elevation23", "elevation24"]);
const _excluded$1p = ["className", "component", "elevation", "square", "variant"];
const useUtilityClasses$1i = (ownerState) => {
  const {
    square,
    elevation,
    variant,
    classes
  } = ownerState;
  const slots = {
    root: ["root", variant, !square && "rounded", variant === "elevation" && `elevation${elevation}`]
  };
  return composeClasses(slots, getPaperUtilityClass, classes);
};
const PaperRoot = styled("div", {
  name: "MuiPaper",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], !ownerState.square && styles2.rounded, ownerState.variant === "elevation" && styles2[`elevation${ownerState.elevation}`]];
  }
})(({
  theme,
  ownerState
}) => {
  var _theme$vars$overlays;
  return _extends({
    backgroundColor: (theme.vars || theme).palette.background.paper,
    color: (theme.vars || theme).palette.text.primary,
    transition: theme.transitions.create("box-shadow")
  }, !ownerState.square && {
    borderRadius: theme.shape.borderRadius
  }, ownerState.variant === "outlined" && {
    border: `1px solid ${(theme.vars || theme).palette.divider}`
  }, ownerState.variant === "elevation" && _extends({
    boxShadow: (theme.vars || theme).shadows[ownerState.elevation]
  }, !theme.vars && theme.palette.mode === "dark" && {
    backgroundImage: `linear-gradient(${alpha_1("#fff", getOverlayAlpha(ownerState.elevation))}, ${alpha_1("#fff", getOverlayAlpha(ownerState.elevation))})`
  }, theme.vars && {
    backgroundImage: (_theme$vars$overlays = theme.vars.overlays) == null ? void 0 : _theme$vars$overlays[ownerState.elevation]
  }));
});
const Paper = /* @__PURE__ */ reactExports.forwardRef(function Paper2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiPaper"
  });
  const {
    className,
    component = "div",
    elevation = 1,
    square = false,
    variant = "elevation"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1p);
  const ownerState = _extends({}, props, {
    component,
    elevation,
    square,
    variant
  });
  const classes = useUtilityClasses$1i(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PaperRoot, _extends({
    as: component,
    ownerState,
    className: clsx(classes.root, className),
    ref
  }, other));
});
function getPopoverUtilityClass(slot) {
  return generateUtilityClass$2("MuiPopover", slot);
}
generateUtilityClasses("MuiPopover", ["root", "paper"]);
const _excluded$1o = ["onEntering"], _excluded2$a = ["action", "anchorEl", "anchorOrigin", "anchorPosition", "anchorReference", "children", "className", "container", "elevation", "marginThreshold", "open", "PaperProps", "slots", "slotProps", "transformOrigin", "TransitionComponent", "transitionDuration", "TransitionProps", "disableScrollLock"], _excluded3$1 = ["slotProps"];
function getOffsetTop(rect, vertical) {
  let offset = 0;
  if (typeof vertical === "number") {
    offset = vertical;
  } else if (vertical === "center") {
    offset = rect.height / 2;
  } else if (vertical === "bottom") {
    offset = rect.height;
  }
  return offset;
}
function getOffsetLeft(rect, horizontal) {
  let offset = 0;
  if (typeof horizontal === "number") {
    offset = horizontal;
  } else if (horizontal === "center") {
    offset = rect.width / 2;
  } else if (horizontal === "right") {
    offset = rect.width;
  }
  return offset;
}
function getTransformOriginValue(transformOrigin) {
  return [transformOrigin.horizontal, transformOrigin.vertical].map((n2) => typeof n2 === "number" ? `${n2}px` : n2).join(" ");
}
function resolveAnchorEl$1(anchorEl) {
  return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}
const useUtilityClasses$1h = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    paper: ["paper"]
  };
  return composeClasses(slots, getPopoverUtilityClass, classes);
};
const PopoverRoot = styled(Modal, {
  name: "MuiPopover",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({});
const PopoverPaper = styled(Paper, {
  name: "MuiPopover",
  slot: "Paper",
  overridesResolver: (props, styles2) => styles2.paper
})({
  position: "absolute",
  overflowY: "auto",
  overflowX: "hidden",
  // So we see the popover when it's empty.
  // It's most likely on issue on userland.
  minWidth: 16,
  minHeight: 16,
  maxWidth: "calc(100% - 32px)",
  maxHeight: "calc(100% - 32px)",
  // We disable the focus ring for mouse, touch and keyboard users.
  outline: 0
});
const Popover = /* @__PURE__ */ reactExports.forwardRef(function Popover2(inProps, ref) {
  var _slotProps$paper, _slots$root, _slots$paper;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiPopover"
  });
  const {
    action,
    anchorEl,
    anchorOrigin = {
      vertical: "top",
      horizontal: "left"
    },
    anchorPosition,
    anchorReference = "anchorEl",
    children,
    className,
    container: containerProp,
    elevation = 8,
    marginThreshold = 16,
    open,
    PaperProps: PaperPropsProp = {},
    slots,
    slotProps,
    transformOrigin = {
      vertical: "top",
      horizontal: "left"
    },
    TransitionComponent = Grow,
    transitionDuration: transitionDurationProp = "auto",
    TransitionProps: {
      onEntering
    } = {},
    disableScrollLock = false
  } = props, TransitionProps = _objectWithoutPropertiesLoose(props.TransitionProps, _excluded$1o), other = _objectWithoutPropertiesLoose(props, _excluded2$a);
  const externalPaperSlotProps = (_slotProps$paper = slotProps == null ? void 0 : slotProps.paper) != null ? _slotProps$paper : PaperPropsProp;
  const paperRef = reactExports.useRef();
  const handlePaperRef = useForkRef(paperRef, externalPaperSlotProps.ref);
  const ownerState = _extends({}, props, {
    anchorOrigin,
    anchorReference,
    elevation,
    marginThreshold,
    externalPaperSlotProps,
    transformOrigin,
    TransitionComponent,
    transitionDuration: transitionDurationProp,
    TransitionProps
  });
  const classes = useUtilityClasses$1h(ownerState);
  const getAnchorOffset = reactExports.useCallback(() => {
    if (anchorReference === "anchorPosition") {
      return anchorPosition;
    }
    const resolvedAnchorEl = resolveAnchorEl$1(anchorEl);
    const anchorElement = resolvedAnchorEl && resolvedAnchorEl.nodeType === 1 ? resolvedAnchorEl : ownerDocument(paperRef.current).body;
    const anchorRect = anchorElement.getBoundingClientRect();
    return {
      top: anchorRect.top + getOffsetTop(anchorRect, anchorOrigin.vertical),
      left: anchorRect.left + getOffsetLeft(anchorRect, anchorOrigin.horizontal)
    };
  }, [anchorEl, anchorOrigin.horizontal, anchorOrigin.vertical, anchorPosition, anchorReference]);
  const getTransformOrigin = reactExports.useCallback((elemRect) => {
    return {
      vertical: getOffsetTop(elemRect, transformOrigin.vertical),
      horizontal: getOffsetLeft(elemRect, transformOrigin.horizontal)
    };
  }, [transformOrigin.horizontal, transformOrigin.vertical]);
  const getPositioningStyle = reactExports.useCallback((element) => {
    const elemRect = {
      width: element.offsetWidth,
      height: element.offsetHeight
    };
    const elemTransformOrigin = getTransformOrigin(elemRect);
    if (anchorReference === "none") {
      return {
        top: null,
        left: null,
        transformOrigin: getTransformOriginValue(elemTransformOrigin)
      };
    }
    const anchorOffset = getAnchorOffset();
    let top = anchorOffset.top - elemTransformOrigin.vertical;
    let left = anchorOffset.left - elemTransformOrigin.horizontal;
    const bottom = top + elemRect.height;
    const right = left + elemRect.width;
    const containerWindow = ownerWindow(resolveAnchorEl$1(anchorEl));
    const heightThreshold = containerWindow.innerHeight - marginThreshold;
    const widthThreshold = containerWindow.innerWidth - marginThreshold;
    if (marginThreshold !== null && top < marginThreshold) {
      const diff = top - marginThreshold;
      top -= diff;
      elemTransformOrigin.vertical += diff;
    } else if (marginThreshold !== null && bottom > heightThreshold) {
      const diff = bottom - heightThreshold;
      top -= diff;
      elemTransformOrigin.vertical += diff;
    }
    if (marginThreshold !== null && left < marginThreshold) {
      const diff = left - marginThreshold;
      left -= diff;
      elemTransformOrigin.horizontal += diff;
    } else if (right > widthThreshold) {
      const diff = right - widthThreshold;
      left -= diff;
      elemTransformOrigin.horizontal += diff;
    }
    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      transformOrigin: getTransformOriginValue(elemTransformOrigin)
    };
  }, [anchorEl, anchorReference, getAnchorOffset, getTransformOrigin, marginThreshold]);
  const [isPositioned, setIsPositioned] = reactExports.useState(open);
  const setPositioningStyles = reactExports.useCallback(() => {
    const element = paperRef.current;
    if (!element) {
      return;
    }
    const positioning = getPositioningStyle(element);
    if (positioning.top !== null) {
      element.style.top = positioning.top;
    }
    if (positioning.left !== null) {
      element.style.left = positioning.left;
    }
    element.style.transformOrigin = positioning.transformOrigin;
    setIsPositioned(true);
  }, [getPositioningStyle]);
  reactExports.useEffect(() => {
    if (disableScrollLock) {
      window.addEventListener("scroll", setPositioningStyles);
    }
    return () => window.removeEventListener("scroll", setPositioningStyles);
  }, [anchorEl, disableScrollLock, setPositioningStyles]);
  const handleEntering = (element, isAppearing) => {
    if (onEntering) {
      onEntering(element, isAppearing);
    }
    setPositioningStyles();
  };
  const handleExited = () => {
    setIsPositioned(false);
  };
  reactExports.useEffect(() => {
    if (open) {
      setPositioningStyles();
    }
  });
  reactExports.useImperativeHandle(action, () => open ? {
    updatePosition: () => {
      setPositioningStyles();
    }
  } : null, [open, setPositioningStyles]);
  reactExports.useEffect(() => {
    if (!open) {
      return void 0;
    }
    const handleResize = debounce(() => {
      setPositioningStyles();
    });
    const containerWindow = ownerWindow(anchorEl);
    containerWindow.addEventListener("resize", handleResize);
    return () => {
      handleResize.clear();
      containerWindow.removeEventListener("resize", handleResize);
    };
  }, [anchorEl, open, setPositioningStyles]);
  let transitionDuration = transitionDurationProp;
  if (transitionDurationProp === "auto" && !TransitionComponent.muiSupportAuto) {
    transitionDuration = void 0;
  }
  const container = containerProp || (anchorEl ? ownerDocument(resolveAnchorEl$1(anchorEl)).body : void 0);
  const RootSlot = (_slots$root = slots == null ? void 0 : slots.root) != null ? _slots$root : PopoverRoot;
  const PaperSlot = (_slots$paper = slots == null ? void 0 : slots.paper) != null ? _slots$paper : PopoverPaper;
  const paperProps = useSlotProps({
    elementType: PaperSlot,
    externalSlotProps: _extends({}, externalPaperSlotProps, {
      style: isPositioned ? externalPaperSlotProps.style : _extends({}, externalPaperSlotProps.style, {
        opacity: 0
      })
    }),
    additionalProps: {
      elevation,
      ref: handlePaperRef
    },
    ownerState,
    className: clsx(classes.paper, externalPaperSlotProps == null ? void 0 : externalPaperSlotProps.className)
  });
  const _useSlotProps = useSlotProps({
    elementType: RootSlot,
    externalSlotProps: (slotProps == null ? void 0 : slotProps.root) || {},
    externalForwardedProps: other,
    additionalProps: {
      ref,
      slotProps: {
        backdrop: {
          invisible: true
        }
      },
      container,
      open
    },
    ownerState,
    className: clsx(classes.root, className)
  }), {
    slotProps: rootSlotPropsProp
  } = _useSlotProps, rootProps = _objectWithoutPropertiesLoose(_useSlotProps, _excluded3$1);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RootSlot, _extends({}, rootProps, !isHostComponent(RootSlot) && {
    slotProps: rootSlotPropsProp,
    disableScrollLock
  }, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
      appear: true,
      in: open,
      onEntering: handleEntering,
      onExited: handleExited,
      timeout: transitionDuration
    }, TransitionProps, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(PaperSlot, _extends({}, paperProps, {
        children
      }))
    }))
  }));
});
function getMenuUtilityClass(slot) {
  return generateUtilityClass$2("MuiMenu", slot);
}
generateUtilityClasses("MuiMenu", ["root", "paper", "list"]);
const _excluded$1n = ["onEntering"], _excluded2$9 = ["autoFocus", "children", "className", "disableAutoFocusItem", "MenuListProps", "onClose", "open", "PaperProps", "PopoverClasses", "transitionDuration", "TransitionProps", "variant", "slots", "slotProps"];
const RTL_ORIGIN = {
  vertical: "top",
  horizontal: "right"
};
const LTR_ORIGIN = {
  vertical: "top",
  horizontal: "left"
};
const useUtilityClasses$1g = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    paper: ["paper"],
    list: ["list"]
  };
  return composeClasses(slots, getMenuUtilityClass, classes);
};
const MenuRoot = styled(Popover, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiMenu",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({});
const MenuPaper = styled(PopoverPaper, {
  name: "MuiMenu",
  slot: "Paper",
  overridesResolver: (props, styles2) => styles2.paper
})({
  // specZ: The maximum height of a simple menu should be one or more rows less than the view
  // height. This ensures a tappable area outside of the simple menu with which to dismiss
  // the menu.
  maxHeight: "calc(100% - 96px)",
  // Add iOS momentum scrolling for iOS < 13.0
  WebkitOverflowScrolling: "touch"
});
const MenuMenuList = styled(MenuList, {
  name: "MuiMenu",
  slot: "List",
  overridesResolver: (props, styles2) => styles2.list
})({
  // We disable the focus ring for mouse, touch and keyboard users.
  outline: 0
});
const Menu = /* @__PURE__ */ reactExports.forwardRef(function Menu2(inProps, ref) {
  var _slots$paper, _slotProps$paper;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiMenu"
  });
  const {
    autoFocus = true,
    children,
    className,
    disableAutoFocusItem = false,
    MenuListProps = {},
    onClose,
    open,
    PaperProps = {},
    PopoverClasses,
    transitionDuration = "auto",
    TransitionProps: {
      onEntering
    } = {},
    variant = "selectedMenu",
    slots = {},
    slotProps = {}
  } = props, TransitionProps = _objectWithoutPropertiesLoose(props.TransitionProps, _excluded$1n), other = _objectWithoutPropertiesLoose(props, _excluded2$9);
  const isRtl = useRtl();
  const ownerState = _extends({}, props, {
    autoFocus,
    disableAutoFocusItem,
    MenuListProps,
    onEntering,
    PaperProps,
    transitionDuration,
    TransitionProps,
    variant
  });
  const classes = useUtilityClasses$1g(ownerState);
  const autoFocusItem = autoFocus && !disableAutoFocusItem && open;
  const menuListActionsRef = reactExports.useRef(null);
  const handleEntering = (element, isAppearing) => {
    if (menuListActionsRef.current) {
      menuListActionsRef.current.adjustStyleForScrollbar(element, {
        direction: isRtl ? "rtl" : "ltr"
      });
    }
    if (onEntering) {
      onEntering(element, isAppearing);
    }
  };
  const handleListKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      if (onClose) {
        onClose(event, "tabKeyDown");
      }
    }
  };
  let activeItemIndex = -1;
  reactExports.Children.map(children, (child, index) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(child)) {
      return;
    }
    if (!child.props.disabled) {
      if (variant === "selectedMenu" && child.props.selected) {
        activeItemIndex = index;
      } else if (activeItemIndex === -1) {
        activeItemIndex = index;
      }
    }
  });
  const PaperSlot = (_slots$paper = slots.paper) != null ? _slots$paper : MenuPaper;
  const paperExternalSlotProps = (_slotProps$paper = slotProps.paper) != null ? _slotProps$paper : PaperProps;
  const rootSlotProps = useSlotProps({
    elementType: slots.root,
    externalSlotProps: slotProps.root,
    ownerState,
    className: [classes.root, className]
  });
  const paperSlotProps = useSlotProps({
    elementType: PaperSlot,
    externalSlotProps: paperExternalSlotProps,
    ownerState,
    className: classes.paper
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MenuRoot, _extends({
    onClose,
    anchorOrigin: {
      vertical: "bottom",
      horizontal: isRtl ? "right" : "left"
    },
    transformOrigin: isRtl ? RTL_ORIGIN : LTR_ORIGIN,
    slots: {
      paper: PaperSlot,
      root: slots.root
    },
    slotProps: {
      root: rootSlotProps,
      paper: paperSlotProps
    },
    open,
    ref,
    transitionDuration,
    TransitionProps: _extends({
      onEntering: handleEntering
    }, TransitionProps),
    ownerState
  }, other, {
    classes: PopoverClasses,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuMenuList, _extends({
      onKeyDown: handleListKeyDown,
      actions: menuListActionsRef,
      autoFocus: autoFocus && (activeItemIndex === -1 || disableAutoFocusItem),
      autoFocusItem,
      variant
    }, MenuListProps, {
      className: clsx(classes.list, MenuListProps.className),
      children
    }))
  }));
});
function getNativeSelectUtilityClasses(slot) {
  return generateUtilityClass$2("MuiNativeSelect", slot);
}
const nativeSelectClasses = generateUtilityClasses("MuiNativeSelect", ["root", "select", "multiple", "filled", "outlined", "standard", "disabled", "icon", "iconOpen", "iconFilled", "iconOutlined", "iconStandard", "nativeInput", "error"]);
const _excluded$1m = ["className", "disabled", "error", "IconComponent", "inputRef", "variant"];
const useUtilityClasses$1f = (ownerState) => {
  const {
    classes,
    variant,
    disabled,
    multiple,
    open,
    error
  } = ownerState;
  const slots = {
    select: ["select", variant, disabled && "disabled", multiple && "multiple", error && "error"],
    icon: ["icon", `icon${capitalize$1(variant)}`, open && "iconOpen", disabled && "disabled"]
  };
  return composeClasses(slots, getNativeSelectUtilityClasses, classes);
};
const nativeSelectSelectStyles = ({
  ownerState,
  theme
}) => _extends({
  MozAppearance: "none",
  // Reset
  WebkitAppearance: "none",
  // Reset
  // When interacting quickly, the text can end up selected.
  // Native select can't be selected either.
  userSelect: "none",
  borderRadius: 0,
  // Reset
  cursor: "pointer",
  "&:focus": _extends({}, theme.vars ? {
    backgroundColor: `rgba(${theme.vars.palette.common.onBackgroundChannel} / 0.05)`
  } : {
    backgroundColor: theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)"
  }, {
    borderRadius: 0
    // Reset Chrome style
  }),
  // Remove IE11 arrow
  "&::-ms-expand": {
    display: "none"
  },
  [`&.${nativeSelectClasses.disabled}`]: {
    cursor: "default"
  },
  "&[multiple]": {
    height: "auto"
  },
  "&:not([multiple]) option, &:not([multiple]) optgroup": {
    backgroundColor: (theme.vars || theme).palette.background.paper
  },
  // Bump specificity to allow extending custom inputs
  "&&&": {
    paddingRight: 24,
    minWidth: 16
    // So it doesn't collapse.
  }
}, ownerState.variant === "filled" && {
  "&&&": {
    paddingRight: 32
  }
}, ownerState.variant === "outlined" && {
  borderRadius: (theme.vars || theme).shape.borderRadius,
  "&:focus": {
    borderRadius: (theme.vars || theme).shape.borderRadius
    // Reset the reset for Chrome style
  },
  "&&&": {
    paddingRight: 32
  }
});
const NativeSelectSelect = styled("select", {
  name: "MuiNativeSelect",
  slot: "Select",
  shouldForwardProp: rootShouldForwardProp,
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.select, styles2[ownerState.variant], ownerState.error && styles2.error, {
      [`&.${nativeSelectClasses.multiple}`]: styles2.multiple
    }];
  }
})(nativeSelectSelectStyles);
const nativeSelectIconStyles = ({
  ownerState,
  theme
}) => _extends({
  // We use a position absolute over a flexbox in order to forward the pointer events
  // to the input and to support wrapping tags..
  position: "absolute",
  right: 0,
  top: "calc(50% - .5em)",
  // Center vertically, height is 1em
  pointerEvents: "none",
  // Don't block pointer events on the select under the icon.
  color: (theme.vars || theme).palette.action.active,
  [`&.${nativeSelectClasses.disabled}`]: {
    color: (theme.vars || theme).palette.action.disabled
  }
}, ownerState.open && {
  transform: "rotate(180deg)"
}, ownerState.variant === "filled" && {
  right: 7
}, ownerState.variant === "outlined" && {
  right: 7
});
const NativeSelectIcon = styled("svg", {
  name: "MuiNativeSelect",
  slot: "Icon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.icon, ownerState.variant && styles2[`icon${capitalize$1(ownerState.variant)}`], ownerState.open && styles2.iconOpen];
  }
})(nativeSelectIconStyles);
const NativeSelectInput = /* @__PURE__ */ reactExports.forwardRef(function NativeSelectInput2(props, ref) {
  const {
    className,
    disabled,
    error,
    IconComponent,
    inputRef,
    variant = "standard"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1m);
  const ownerState = _extends({}, props, {
    disabled,
    variant,
    error
  });
  const classes = useUtilityClasses$1f(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(NativeSelectSelect, _extends({
      ownerState,
      className: clsx(classes.select, className),
      disabled,
      ref: inputRef || ref
    }, other)), props.multiple ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(NativeSelectIcon, {
      as: IconComponent,
      ownerState,
      className: classes.icon
    })]
  });
});
function getSelectUtilityClasses(slot) {
  return generateUtilityClass$2("MuiSelect", slot);
}
const selectClasses = generateUtilityClasses("MuiSelect", ["root", "select", "multiple", "filled", "outlined", "standard", "disabled", "focused", "icon", "iconOpen", "iconFilled", "iconOutlined", "iconStandard", "nativeInput", "error"]);
var _span$1;
const _excluded$1l = ["aria-describedby", "aria-label", "autoFocus", "autoWidth", "children", "className", "defaultOpen", "defaultValue", "disabled", "displayEmpty", "error", "IconComponent", "inputRef", "labelId", "MenuProps", "multiple", "name", "onBlur", "onChange", "onClose", "onFocus", "onOpen", "open", "readOnly", "renderValue", "SelectDisplayProps", "tabIndex", "type", "value", "variant"];
const SelectSelect = styled("div", {
  name: "MuiSelect",
  slot: "Select",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [
      // Win specificity over the input base
      {
        [`&.${selectClasses.select}`]: styles2.select
      },
      {
        [`&.${selectClasses.select}`]: styles2[ownerState.variant]
      },
      {
        [`&.${selectClasses.error}`]: styles2.error
      },
      {
        [`&.${selectClasses.multiple}`]: styles2.multiple
      }
    ];
  }
})(nativeSelectSelectStyles, {
  // Win specificity over the input base
  [`&.${selectClasses.select}`]: {
    height: "auto",
    // Resets for multiple select with chips
    minHeight: "1.4375em",
    // Required for select\text-field height consistency
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden"
  }
});
const SelectIcon = styled("svg", {
  name: "MuiSelect",
  slot: "Icon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.icon, ownerState.variant && styles2[`icon${capitalize$1(ownerState.variant)}`], ownerState.open && styles2.iconOpen];
  }
})(nativeSelectIconStyles);
const SelectNativeInput = styled("input", {
  shouldForwardProp: (prop) => slotShouldForwardProp(prop) && prop !== "classes",
  name: "MuiSelect",
  slot: "NativeInput",
  overridesResolver: (props, styles2) => styles2.nativeInput
})({
  bottom: 0,
  left: 0,
  position: "absolute",
  opacity: 0,
  pointerEvents: "none",
  width: "100%",
  boxSizing: "border-box"
});
function areEqualValues$1(a, b2) {
  if (typeof b2 === "object" && b2 !== null) {
    return a === b2;
  }
  return String(a) === String(b2);
}
function isEmpty(display) {
  return display == null || typeof display === "string" && !display.trim();
}
const useUtilityClasses$1e = (ownerState) => {
  const {
    classes,
    variant,
    disabled,
    multiple,
    open,
    error
  } = ownerState;
  const slots = {
    select: ["select", variant, disabled && "disabled", multiple && "multiple", error && "error"],
    icon: ["icon", `icon${capitalize$1(variant)}`, open && "iconOpen", disabled && "disabled"],
    nativeInput: ["nativeInput"]
  };
  return composeClasses(slots, getSelectUtilityClasses, classes);
};
const SelectInput = /* @__PURE__ */ reactExports.forwardRef(function SelectInput2(props, ref) {
  var _MenuProps$slotProps;
  const {
    "aria-describedby": ariaDescribedby,
    "aria-label": ariaLabel,
    autoFocus,
    autoWidth,
    children,
    className,
    defaultOpen,
    defaultValue,
    disabled,
    displayEmpty,
    error = false,
    IconComponent,
    inputRef: inputRefProp,
    labelId,
    MenuProps = {},
    multiple,
    name,
    onBlur,
    onChange,
    onClose,
    onFocus,
    onOpen,
    open: openProp,
    readOnly,
    renderValue,
    SelectDisplayProps = {},
    tabIndex: tabIndexProp,
    value: valueProp,
    variant = "standard"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1l);
  const [value, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: "Select"
  });
  const [openState, setOpenState] = useControlled({
    controlled: openProp,
    default: defaultOpen,
    name: "Select"
  });
  const inputRef = reactExports.useRef(null);
  const displayRef = reactExports.useRef(null);
  const [displayNode, setDisplayNode] = reactExports.useState(null);
  const {
    current: isOpenControlled
  } = reactExports.useRef(openProp != null);
  const [menuMinWidthState, setMenuMinWidthState] = reactExports.useState();
  const handleRef = useForkRef(ref, inputRefProp);
  const handleDisplayRef = reactExports.useCallback((node) => {
    displayRef.current = node;
    if (node) {
      setDisplayNode(node);
    }
  }, []);
  const anchorElement = displayNode == null ? void 0 : displayNode.parentNode;
  reactExports.useImperativeHandle(handleRef, () => ({
    focus: () => {
      displayRef.current.focus();
    },
    node: inputRef.current,
    value
  }), [value]);
  reactExports.useEffect(() => {
    if (defaultOpen && openState && displayNode && !isOpenControlled) {
      setMenuMinWidthState(autoWidth ? null : anchorElement.clientWidth);
      displayRef.current.focus();
    }
  }, [displayNode, autoWidth]);
  reactExports.useEffect(() => {
    if (autoFocus) {
      displayRef.current.focus();
    }
  }, [autoFocus]);
  reactExports.useEffect(() => {
    if (!labelId) {
      return void 0;
    }
    const label = ownerDocument(displayRef.current).getElementById(labelId);
    if (label) {
      const handler = () => {
        if (getSelection().isCollapsed) {
          displayRef.current.focus();
        }
      };
      label.addEventListener("click", handler);
      return () => {
        label.removeEventListener("click", handler);
      };
    }
    return void 0;
  }, [labelId]);
  const update = (open2, event) => {
    if (open2) {
      if (onOpen) {
        onOpen(event);
      }
    } else if (onClose) {
      onClose(event);
    }
    if (!isOpenControlled) {
      setMenuMinWidthState(autoWidth ? null : anchorElement.clientWidth);
      setOpenState(open2);
    }
  };
  const handleMouseDown = (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    displayRef.current.focus();
    update(true, event);
  };
  const handleClose = (event) => {
    update(false, event);
  };
  const childrenArray = reactExports.Children.toArray(children);
  const handleChange = (event) => {
    const child = childrenArray.find((childItem) => childItem.props.value === event.target.value);
    if (child === void 0) {
      return;
    }
    setValueState(child.props.value);
    if (onChange) {
      onChange(event, child);
    }
  };
  const handleItemClick = (child) => (event) => {
    let newValue;
    if (!event.currentTarget.hasAttribute("tabindex")) {
      return;
    }
    if (multiple) {
      newValue = Array.isArray(value) ? value.slice() : [];
      const itemIndex = value.indexOf(child.props.value);
      if (itemIndex === -1) {
        newValue.push(child.props.value);
      } else {
        newValue.splice(itemIndex, 1);
      }
    } else {
      newValue = child.props.value;
    }
    if (child.props.onClick) {
      child.props.onClick(event);
    }
    if (value !== newValue) {
      setValueState(newValue);
      if (onChange) {
        const nativeEvent = event.nativeEvent || event;
        const clonedEvent = new nativeEvent.constructor(nativeEvent.type, nativeEvent);
        Object.defineProperty(clonedEvent, "target", {
          writable: true,
          value: {
            value: newValue,
            name
          }
        });
        onChange(clonedEvent, child);
      }
    }
    if (!multiple) {
      update(false, event);
    }
  };
  const handleKeyDown2 = (event) => {
    if (!readOnly) {
      const validKeys = [
        " ",
        "ArrowUp",
        "ArrowDown",
        // The native select doesn't respond to enter on macOS, but it's recommended by
        // https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
        "Enter"
      ];
      if (validKeys.indexOf(event.key) !== -1) {
        event.preventDefault();
        update(true, event);
      }
    }
  };
  const open = displayNode !== null && openState;
  const handleBlur = (event) => {
    if (!open && onBlur) {
      Object.defineProperty(event, "target", {
        writable: true,
        value: {
          value,
          name
        }
      });
      onBlur(event);
    }
  };
  delete other["aria-invalid"];
  let display;
  let displaySingle;
  const displayMultiple = [];
  let computeDisplay = false;
  if (isFilled({
    value
  }) || displayEmpty) {
    if (renderValue) {
      display = renderValue(value);
    } else {
      computeDisplay = true;
    }
  }
  const items = childrenArray.map((child) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(child)) {
      return null;
    }
    let selected;
    if (multiple) {
      if (!Array.isArray(value)) {
        throw new Error(formatMuiErrorMessage$1(2));
      }
      selected = value.some((v2) => areEqualValues$1(v2, child.props.value));
      if (selected && computeDisplay) {
        displayMultiple.push(child.props.children);
      }
    } else {
      selected = areEqualValues$1(value, child.props.value);
      if (selected && computeDisplay) {
        displaySingle = child.props.children;
      }
    }
    return /* @__PURE__ */ reactExports.cloneElement(child, {
      "aria-selected": selected ? "true" : "false",
      onClick: handleItemClick(child),
      onKeyUp: (event) => {
        if (event.key === " ") {
          event.preventDefault();
        }
        if (child.props.onKeyUp) {
          child.props.onKeyUp(event);
        }
      },
      role: "option",
      selected,
      value: void 0,
      // The value is most likely not a valid HTML attribute.
      "data-value": child.props.value
      // Instead, we provide it as a data attribute.
    });
  });
  if (computeDisplay) {
    if (multiple) {
      if (displayMultiple.length === 0) {
        display = null;
      } else {
        display = displayMultiple.reduce((output, child, index) => {
          output.push(child);
          if (index < displayMultiple.length - 1) {
            output.push(", ");
          }
          return output;
        }, []);
      }
    } else {
      display = displaySingle;
    }
  }
  let menuMinWidth = menuMinWidthState;
  if (!autoWidth && isOpenControlled && displayNode) {
    menuMinWidth = anchorElement.clientWidth;
  }
  let tabIndex;
  if (typeof tabIndexProp !== "undefined") {
    tabIndex = tabIndexProp;
  } else {
    tabIndex = disabled ? null : 0;
  }
  const buttonId = SelectDisplayProps.id || (name ? `mui-component-select-${name}` : void 0);
  const ownerState = _extends({}, props, {
    variant,
    value,
    open,
    error
  });
  const classes = useUtilityClasses$1e(ownerState);
  const paperProps = _extends({}, MenuProps.PaperProps, (_MenuProps$slotProps = MenuProps.slotProps) == null ? void 0 : _MenuProps$slotProps.paper);
  const listboxId = useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectSelect, _extends({
      ref: handleDisplayRef,
      tabIndex,
      role: "combobox",
      "aria-controls": listboxId,
      "aria-disabled": disabled ? "true" : void 0,
      "aria-expanded": open ? "true" : "false",
      "aria-haspopup": "listbox",
      "aria-label": ariaLabel,
      "aria-labelledby": [labelId, buttonId].filter(Boolean).join(" ") || void 0,
      "aria-describedby": ariaDescribedby,
      onKeyDown: handleKeyDown2,
      onMouseDown: disabled || readOnly ? null : handleMouseDown,
      onBlur: handleBlur,
      onFocus
    }, SelectDisplayProps, {
      ownerState,
      className: clsx(SelectDisplayProps.className, classes.select, className),
      id: buttonId,
      children: isEmpty(display) ? (
        // notranslate needed while Google Translate will not fix zero-width space issue
        _span$1 || (_span$1 = /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "notranslate",
          children: "​"
        }))
      ) : display
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectNativeInput, _extends({
      "aria-invalid": error,
      value: Array.isArray(value) ? value.join(",") : value,
      name,
      ref: inputRef,
      "aria-hidden": true,
      onChange: handleChange,
      tabIndex: -1,
      disabled,
      className: classes.nativeInput,
      autoFocus,
      ownerState
    }, other)), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectIcon, {
      as: IconComponent,
      className: classes.icon,
      ownerState
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, _extends({
      id: `menu-${name || ""}`,
      anchorEl: anchorElement,
      open,
      onClose: handleClose,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "center"
      },
      transformOrigin: {
        vertical: "top",
        horizontal: "center"
      }
    }, MenuProps, {
      MenuListProps: _extends({
        "aria-labelledby": labelId,
        role: "listbox",
        "aria-multiselectable": multiple ? "true" : void 0,
        disableListWrap: true,
        id: listboxId
      }, MenuProps.MenuListProps),
      slotProps: _extends({}, MenuProps.slotProps, {
        paper: _extends({}, paperProps, {
          style: _extends({
            minWidth: menuMinWidth
          }, paperProps != null ? paperProps.style : null)
        })
      }),
      children: items
    }))]
  });
});
const ArrowDropDownIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7 10l5 5 5-5z"
}), "ArrowDropDown");
const _excluded$1k = ["autoWidth", "children", "classes", "className", "defaultOpen", "displayEmpty", "IconComponent", "id", "input", "inputProps", "label", "labelId", "MenuProps", "multiple", "native", "onClose", "onOpen", "open", "renderValue", "SelectDisplayProps", "variant"], _excluded2$8 = ["root"];
const useUtilityClasses$1d = (ownerState) => {
  const {
    classes
  } = ownerState;
  return classes;
};
const styledRootConfig = {
  name: "MuiSelect",
  overridesResolver: (props, styles2) => styles2.root,
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) && prop !== "variant",
  slot: "Root"
};
const StyledInput = styled(Input, styledRootConfig)("");
const StyledOutlinedInput = styled(OutlinedInput, styledRootConfig)("");
const StyledFilledInput = styled(FilledInput, styledRootConfig)("");
const Select = /* @__PURE__ */ reactExports.forwardRef(function Select2(inProps, ref) {
  const props = useThemeProps$a({
    name: "MuiSelect",
    props: inProps
  });
  const {
    autoWidth = false,
    children,
    classes: classesProp = {},
    className,
    defaultOpen = false,
    displayEmpty = false,
    IconComponent = ArrowDropDownIcon,
    id,
    input,
    inputProps,
    label,
    labelId,
    MenuProps,
    multiple = false,
    native = false,
    onClose,
    onOpen,
    open,
    renderValue,
    SelectDisplayProps,
    variant: variantProp = "outlined"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1k);
  const inputComponent = native ? NativeSelectInput : SelectInput;
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["variant", "error"]
  });
  const variant = fcs.variant || variantProp;
  const ownerState = _extends({}, props, {
    variant,
    classes: classesProp
  });
  const classes = useUtilityClasses$1d(ownerState);
  const restOfClasses = _objectWithoutPropertiesLoose(classes, _excluded2$8);
  const InputComponent = input || {
    standard: /* @__PURE__ */ jsxRuntimeExports.jsx(StyledInput, {
      ownerState
    }),
    outlined: /* @__PURE__ */ jsxRuntimeExports.jsx(StyledOutlinedInput, {
      label,
      ownerState
    }),
    filled: /* @__PURE__ */ jsxRuntimeExports.jsx(StyledFilledInput, {
      ownerState
    })
  }[variant];
  const inputComponentRef = useForkRef(ref, InputComponent.ref);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: /* @__PURE__ */ reactExports.cloneElement(InputComponent, _extends({
      // Most of the logic is implemented in `SelectInput`.
      // The `Select` component is a simple API wrapper to expose something better to play with.
      inputComponent,
      inputProps: _extends({
        children,
        error: fcs.error,
        IconComponent,
        variant,
        type: void 0,
        // We render a select. We can ignore the type provided by the `Input`.
        multiple
      }, native ? {
        id
      } : {
        autoWidth,
        defaultOpen,
        displayEmpty,
        labelId,
        MenuProps,
        onClose,
        onOpen,
        open,
        renderValue,
        SelectDisplayProps: _extends({
          id
        }, SelectDisplayProps)
      }, inputProps, {
        classes: inputProps ? deepmerge$1(restOfClasses, inputProps.classes) : restOfClasses
      }, input ? input.props.inputProps : {})
    }, (multiple && native || displayEmpty) && variant === "outlined" ? {
      notched: true
    } : {}, {
      ref: inputComponentRef,
      className: clsx(InputComponent.props.className, className, classes.root)
    }, !input && {
      variant
    }, other))
  });
});
Select.muiName = "Select";
function getTextFieldUtilityClass(slot) {
  return generateUtilityClass$2("MuiTextField", slot);
}
generateUtilityClasses("MuiTextField", ["root"]);
const _excluded$1j = ["autoComplete", "autoFocus", "children", "className", "color", "defaultValue", "disabled", "error", "FormHelperTextProps", "fullWidth", "helperText", "id", "InputLabelProps", "inputProps", "InputProps", "inputRef", "label", "maxRows", "minRows", "multiline", "name", "onBlur", "onChange", "onFocus", "placeholder", "required", "rows", "select", "SelectProps", "type", "value", "variant"];
const variantComponent = {
  standard: Input,
  filled: FilledInput,
  outlined: OutlinedInput
};
const useUtilityClasses$1c = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTextFieldUtilityClass, classes);
};
const TextFieldRoot = styled(FormControl, {
  name: "MuiTextField",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({});
const TextField = /* @__PURE__ */ reactExports.forwardRef(function TextField2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTextField"
  });
  const {
    autoComplete,
    autoFocus = false,
    children,
    className,
    color: color2 = "primary",
    defaultValue,
    disabled = false,
    error = false,
    FormHelperTextProps,
    fullWidth = false,
    helperText,
    id: idOverride,
    InputLabelProps,
    inputProps,
    InputProps,
    inputRef,
    label,
    maxRows,
    minRows,
    multiline = false,
    name,
    onBlur,
    onChange,
    onFocus,
    placeholder,
    required = false,
    rows,
    select = false,
    SelectProps,
    type,
    value,
    variant = "outlined"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1j);
  const ownerState = _extends({}, props, {
    autoFocus,
    color: color2,
    disabled,
    error,
    fullWidth,
    multiline,
    required,
    select,
    variant
  });
  const classes = useUtilityClasses$1c(ownerState);
  const InputMore = {};
  if (variant === "outlined") {
    if (InputLabelProps && typeof InputLabelProps.shrink !== "undefined") {
      InputMore.notched = InputLabelProps.shrink;
    }
    InputMore.label = label;
  }
  if (select) {
    if (!SelectProps || !SelectProps.native) {
      InputMore.id = void 0;
    }
    InputMore["aria-describedby"] = void 0;
  }
  const id = useId(idOverride);
  const helperTextId = helperText && id ? `${id}-helper-text` : void 0;
  const inputLabelId = label && id ? `${id}-label` : void 0;
  const InputComponent = variantComponent[variant];
  const InputElement = /* @__PURE__ */ jsxRuntimeExports.jsx(InputComponent, _extends({
    "aria-describedby": helperTextId,
    autoComplete,
    autoFocus,
    defaultValue,
    fullWidth,
    multiline,
    name,
    rows,
    maxRows,
    minRows,
    type,
    value,
    id,
    inputRef,
    onBlur,
    onChange,
    onFocus,
    placeholder,
    inputProps
  }, InputMore, InputProps));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(TextFieldRoot, _extends({
    className: clsx(classes.root, className),
    disabled,
    error,
    fullWidth,
    ref,
    required,
    color: color2,
    variant,
    ownerState
  }, other, {
    children: [label != null && label !== "" && /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, _extends({
      htmlFor: id,
      id: inputLabelId
    }, InputLabelProps, {
      children: label
    })), select ? /* @__PURE__ */ jsxRuntimeExports.jsx(Select, _extends({
      "aria-describedby": helperTextId,
      id,
      labelId: inputLabelId,
      value,
      input: InputElement
    }, SelectProps, {
      children
    })) : InputElement, helperText && /* @__PURE__ */ jsxRuntimeExports.jsx(FormHelperText, _extends({
      id: helperTextId
    }, FormHelperTextProps, {
      children: helperText
    }))]
  }));
});
function getInputAdornmentUtilityClass(slot) {
  return generateUtilityClass$2("MuiInputAdornment", slot);
}
const inputAdornmentClasses = generateUtilityClasses("MuiInputAdornment", ["root", "filled", "standard", "outlined", "positionStart", "positionEnd", "disablePointerEvents", "hiddenLabel", "sizeSmall"]);
var _span;
const _excluded$1i = ["children", "className", "component", "disablePointerEvents", "disableTypography", "position", "variant"];
const overridesResolver$4 = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, styles2[`position${capitalize$1(ownerState.position)}`], ownerState.disablePointerEvents === true && styles2.disablePointerEvents, styles2[ownerState.variant]];
};
const useUtilityClasses$1b = (ownerState) => {
  const {
    classes,
    disablePointerEvents,
    hiddenLabel,
    position: position2,
    size,
    variant
  } = ownerState;
  const slots = {
    root: ["root", disablePointerEvents && "disablePointerEvents", position2 && `position${capitalize$1(position2)}`, variant, hiddenLabel && "hiddenLabel", size && `size${capitalize$1(size)}`]
  };
  return composeClasses(slots, getInputAdornmentUtilityClass, classes);
};
const InputAdornmentRoot = styled("div", {
  name: "MuiInputAdornment",
  slot: "Root",
  overridesResolver: overridesResolver$4
})(({
  theme,
  ownerState
}) => _extends({
  display: "flex",
  height: "0.01em",
  // Fix IE11 flexbox alignment. To remove at some point.
  maxHeight: "2em",
  alignItems: "center",
  whiteSpace: "nowrap",
  color: (theme.vars || theme).palette.action.active
}, ownerState.variant === "filled" && {
  // Styles applied to the root element if `variant="filled"`.
  [`&.${inputAdornmentClasses.positionStart}&:not(.${inputAdornmentClasses.hiddenLabel})`]: {
    marginTop: 16
  }
}, ownerState.position === "start" && {
  // Styles applied to the root element if `position="start"`.
  marginRight: 8
}, ownerState.position === "end" && {
  // Styles applied to the root element if `position="end"`.
  marginLeft: 8
}, ownerState.disablePointerEvents === true && {
  // Styles applied to the root element if `disablePointerEvents={true}`.
  pointerEvents: "none"
}));
const InputAdornment = /* @__PURE__ */ reactExports.forwardRef(function InputAdornment2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiInputAdornment"
  });
  const {
    children,
    className,
    component = "div",
    disablePointerEvents = false,
    disableTypography = false,
    position: position2,
    variant: variantProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1i);
  const muiFormControl = useFormControl() || {};
  let variant = variantProp;
  if (variantProp && muiFormControl.variant) ;
  if (muiFormControl && !variant) {
    variant = muiFormControl.variant;
  }
  const ownerState = _extends({}, props, {
    hiddenLabel: muiFormControl.hiddenLabel,
    size: muiFormControl.size,
    disablePointerEvents,
    position: position2,
    variant
  });
  const classes = useUtilityClasses$1b(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlContext.Provider, {
    value: null,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornmentRoot, _extends({
      as: component,
      ownerState,
      className: clsx(classes.root, className),
      ref
    }, other, {
      children: typeof children === "string" && !disableTypography ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, {
        color: "text.secondary",
        children
      }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
        children: [position2 === "start" ? (
          /* notranslate needed while Google Translate will not fix zero-width space issue */
          _span || (_span = /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "notranslate",
            children: "​"
          }))
        ) : null, children]
      })
    }))
  });
});
function getDialogContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiDialogContent", slot);
}
generateUtilityClasses("MuiDialogContent", ["root", "dividers"]);
function getDialogTitleUtilityClass(slot) {
  return generateUtilityClass$2("MuiDialogTitle", slot);
}
const dialogTitleClasses = generateUtilityClasses("MuiDialogTitle", ["root"]);
const _excluded$1h = ["className", "dividers"];
const useUtilityClasses$1a = (ownerState) => {
  const {
    classes,
    dividers
  } = ownerState;
  const slots = {
    root: ["root", dividers && "dividers"]
  };
  return composeClasses(slots, getDialogContentUtilityClass, classes);
};
const DialogContentRoot = styled("div", {
  name: "MuiDialogContent",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.dividers && styles2.dividers];
  }
})(({
  theme,
  ownerState
}) => _extends({
  flex: "1 1 auto",
  // Add iOS momentum scrolling for iOS < 13.0
  WebkitOverflowScrolling: "touch",
  overflowY: "auto",
  padding: "20px 24px"
}, ownerState.dividers ? {
  padding: "16px 24px",
  borderTop: `1px solid ${(theme.vars || theme).palette.divider}`,
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`
} : {
  [`.${dialogTitleClasses.root} + &`]: {
    paddingTop: 0
  }
}));
const DialogContent = /* @__PURE__ */ reactExports.forwardRef(function DialogContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDialogContent"
  });
  const {
    className,
    dividers = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1h);
  const ownerState = _extends({}, props, {
    dividers
  });
  const classes = useUtilityClasses$1a(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getDialogUtilityClass(slot) {
  return generateUtilityClass$2("MuiDialog", slot);
}
const dialogClasses = generateUtilityClasses("MuiDialog", ["root", "scrollPaper", "scrollBody", "container", "paper", "paperScrollPaper", "paperScrollBody", "paperWidthFalse", "paperWidthXs", "paperWidthSm", "paperWidthMd", "paperWidthLg", "paperWidthXl", "paperFullWidth", "paperFullScreen"]);
const DialogContext = /* @__PURE__ */ reactExports.createContext({});
const _excluded$1g = ["aria-describedby", "aria-labelledby", "BackdropComponent", "BackdropProps", "children", "className", "disableEscapeKeyDown", "fullScreen", "fullWidth", "maxWidth", "onBackdropClick", "onClose", "open", "PaperComponent", "PaperProps", "scroll", "TransitionComponent", "transitionDuration", "TransitionProps"];
const DialogBackdrop = styled(Backdrop, {
  name: "MuiDialog",
  slot: "Backdrop",
  overrides: (props, styles2) => styles2.backdrop
})({
  // Improve scrollable dialog support.
  zIndex: -1
});
const useUtilityClasses$19 = (ownerState) => {
  const {
    classes,
    scroll,
    maxWidth: maxWidth2,
    fullWidth,
    fullScreen
  } = ownerState;
  const slots = {
    root: ["root"],
    container: ["container", `scroll${capitalize$1(scroll)}`],
    paper: ["paper", `paperScroll${capitalize$1(scroll)}`, `paperWidth${capitalize$1(String(maxWidth2))}`, fullWidth && "paperFullWidth", fullScreen && "paperFullScreen"]
  };
  return composeClasses(slots, getDialogUtilityClass, classes);
};
const DialogRoot = styled(Modal, {
  name: "MuiDialog",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  "@media print": {
    // Use !important to override the Modal inline-style.
    position: "absolute !important"
  }
});
const DialogContainer = styled("div", {
  name: "MuiDialog",
  slot: "Container",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.container, styles2[`scroll${capitalize$1(ownerState.scroll)}`]];
  }
})(({
  ownerState
}) => _extends({
  height: "100%",
  "@media print": {
    height: "auto"
  },
  // We disable the focus ring for mouse, touch and keyboard users.
  outline: 0
}, ownerState.scroll === "paper" && {
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
}, ownerState.scroll === "body" && {
  overflowY: "auto",
  overflowX: "hidden",
  textAlign: "center",
  "&::after": {
    content: '""',
    display: "inline-block",
    verticalAlign: "middle",
    height: "100%",
    width: "0"
  }
}));
const DialogPaper = styled(Paper, {
  name: "MuiDialog",
  slot: "Paper",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.paper, styles2[`scrollPaper${capitalize$1(ownerState.scroll)}`], styles2[`paperWidth${capitalize$1(String(ownerState.maxWidth))}`], ownerState.fullWidth && styles2.paperFullWidth, ownerState.fullScreen && styles2.paperFullScreen];
  }
})(({
  theme,
  ownerState
}) => _extends({
  margin: 32,
  position: "relative",
  overflowY: "auto",
  // Fix IE11 issue, to remove at some point.
  "@media print": {
    overflowY: "visible",
    boxShadow: "none"
  }
}, ownerState.scroll === "paper" && {
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(100% - 64px)"
}, ownerState.scroll === "body" && {
  display: "inline-block",
  verticalAlign: "middle",
  textAlign: "left"
  // 'initial' doesn't work on IE11
}, !ownerState.maxWidth && {
  maxWidth: "calc(100% - 64px)"
}, ownerState.maxWidth === "xs" && {
  maxWidth: theme.breakpoints.unit === "px" ? Math.max(theme.breakpoints.values.xs, 444) : `max(${theme.breakpoints.values.xs}${theme.breakpoints.unit}, 444px)`,
  [`&.${dialogClasses.paperScrollBody}`]: {
    [theme.breakpoints.down(Math.max(theme.breakpoints.values.xs, 444) + 32 * 2)]: {
      maxWidth: "calc(100% - 64px)"
    }
  }
}, ownerState.maxWidth && ownerState.maxWidth !== "xs" && {
  maxWidth: `${theme.breakpoints.values[ownerState.maxWidth]}${theme.breakpoints.unit}`,
  [`&.${dialogClasses.paperScrollBody}`]: {
    [theme.breakpoints.down(theme.breakpoints.values[ownerState.maxWidth] + 32 * 2)]: {
      maxWidth: "calc(100% - 64px)"
    }
  }
}, ownerState.fullWidth && {
  width: "calc(100% - 64px)"
}, ownerState.fullScreen && {
  margin: 0,
  width: "100%",
  maxWidth: "100%",
  height: "100%",
  maxHeight: "none",
  borderRadius: 0,
  [`&.${dialogClasses.paperScrollBody}`]: {
    margin: 0,
    maxWidth: "100%"
  }
}));
const Dialog = /* @__PURE__ */ reactExports.forwardRef(function Dialog2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDialog"
  });
  const theme = useTheme$1();
  const defaultTransitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    "aria-describedby": ariaDescribedby,
    "aria-labelledby": ariaLabelledbyProp,
    BackdropComponent,
    BackdropProps,
    children,
    className,
    disableEscapeKeyDown = false,
    fullScreen = false,
    fullWidth = false,
    maxWidth: maxWidth2 = "sm",
    onBackdropClick,
    onClose,
    open,
    PaperComponent = Paper,
    PaperProps = {},
    scroll = "paper",
    TransitionComponent = Fade,
    transitionDuration = defaultTransitionDuration,
    TransitionProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1g);
  const ownerState = _extends({}, props, {
    disableEscapeKeyDown,
    fullScreen,
    fullWidth,
    maxWidth: maxWidth2,
    scroll
  });
  const classes = useUtilityClasses$19(ownerState);
  const backdropClick = reactExports.useRef();
  const handleMouseDown = (event) => {
    backdropClick.current = event.target === event.currentTarget;
  };
  const handleBackdropClick = (event) => {
    if (!backdropClick.current) {
      return;
    }
    backdropClick.current = null;
    if (onBackdropClick) {
      onBackdropClick(event);
    }
    if (onClose) {
      onClose(event, "backdropClick");
    }
  };
  const ariaLabelledby = useId(ariaLabelledbyProp);
  const dialogContextValue = reactExports.useMemo(() => {
    return {
      titleId: ariaLabelledby
    };
  }, [ariaLabelledby]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, _extends({
    className: clsx(classes.root, className),
    closeAfterTransition: true,
    components: {
      Backdrop: DialogBackdrop
    },
    componentsProps: {
      backdrop: _extends({
        transitionDuration,
        as: BackdropComponent
      }, BackdropProps)
    },
    disableEscapeKeyDown,
    onClose,
    open,
    ref,
    onClick: handleBackdropClick,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
      appear: true,
      in: open,
      timeout: transitionDuration,
      role: "presentation"
    }, TransitionProps, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContainer, {
        className: clsx(classes.container),
        onMouseDown: handleMouseDown,
        ownerState,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogPaper, _extends({
          as: PaperComponent,
          elevation: 24,
          role: "dialog",
          "aria-describedby": ariaDescribedby,
          "aria-labelledby": ariaLabelledby
        }, PaperProps, {
          className: clsx(classes.paper, PaperProps.className),
          ownerState,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContext.Provider, {
            value: dialogContextValue,
            children
          })
        }))
      })
    }))
  }));
});
var useThemeWithoutDefault = {};
Object.defineProperty(useThemeWithoutDefault, "__esModule", {
  value: true
});
var default_1$X = useThemeWithoutDefault.default = void 0;
var React = _interopRequireWildcard(reactExports);
var _styledEngine = require$$1;
function _getRequireWildcardCache(e2) {
  if ("function" != typeof WeakMap) return null;
  var r = /* @__PURE__ */ new WeakMap(), t2 = /* @__PURE__ */ new WeakMap();
  return (_getRequireWildcardCache = function(e3) {
    return e3 ? t2 : r;
  })(e2);
}
function _interopRequireWildcard(e2, r) {
  if (e2 && e2.__esModule) return e2;
  if (null === e2 || "object" != typeof e2 && "function" != typeof e2) return { default: e2 };
  var t2 = _getRequireWildcardCache(r);
  if (t2 && t2.has(e2)) return t2.get(e2);
  var n2 = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var u2 in e2) if ("default" !== u2 && Object.prototype.hasOwnProperty.call(e2, u2)) {
    var i = a ? Object.getOwnPropertyDescriptor(e2, u2) : null;
    i && (i.get || i.set) ? Object.defineProperty(n2, u2, i) : n2[u2] = e2[u2];
  }
  return n2.default = e2, t2 && t2.set(e2, n2), n2;
}
function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0;
}
function useTheme(defaultTheme2 = null) {
  const contextTheme = React.useContext(_styledEngine.ThemeContext);
  return !contextTheme || isObjectEmpty(contextTheme) ? defaultTheme2 : contextTheme;
}
default_1$X = useThemeWithoutDefault.default = useTheme;
const _excluded$1f = ["anchorEl", "component", "components", "componentsProps", "container", "disablePortal", "keepMounted", "modifiers", "open", "placement", "popperOptions", "popperRef", "transition", "slots", "slotProps"];
const PopperRoot = styled(Popper$2, {
  name: "MuiPopper",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({});
const Popper$1 = /* @__PURE__ */ reactExports.forwardRef(function Popper22(inProps, ref) {
  var _slots$root;
  const theme = default_1$X();
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiPopper"
  });
  const {
    anchorEl,
    component,
    components,
    componentsProps,
    container,
    disablePortal,
    keepMounted,
    modifiers,
    open,
    placement,
    popperOptions,
    popperRef,
    transition,
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1f);
  const RootComponent = (_slots$root = slots == null ? void 0 : slots.root) != null ? _slots$root : components == null ? void 0 : components.Root;
  const otherProps = _extends({
    anchorEl,
    container,
    disablePortal,
    keepMounted,
    modifiers,
    open,
    placement,
    popperOptions,
    popperRef,
    transition
  }, other);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PopperRoot, _extends({
    as: component,
    direction: theme == null ? void 0 : theme.direction,
    slots: {
      root: RootComponent
    },
    slotProps: slotProps != null ? slotProps : componentsProps
  }, otherProps, {
    ref
  }));
});
function getButtonUtilityClass(slot) {
  return generateUtilityClass$2("MuiButton", slot);
}
const buttonClasses = generateUtilityClasses("MuiButton", ["root", "text", "textInherit", "textPrimary", "textSecondary", "textSuccess", "textError", "textInfo", "textWarning", "outlined", "outlinedInherit", "outlinedPrimary", "outlinedSecondary", "outlinedSuccess", "outlinedError", "outlinedInfo", "outlinedWarning", "contained", "containedInherit", "containedPrimary", "containedSecondary", "containedSuccess", "containedError", "containedInfo", "containedWarning", "disableElevation", "focusVisible", "disabled", "colorInherit", "colorPrimary", "colorSecondary", "colorSuccess", "colorError", "colorInfo", "colorWarning", "textSizeSmall", "textSizeMedium", "textSizeLarge", "outlinedSizeSmall", "outlinedSizeMedium", "outlinedSizeLarge", "containedSizeSmall", "containedSizeMedium", "containedSizeLarge", "sizeMedium", "sizeSmall", "sizeLarge", "fullWidth", "startIcon", "endIcon", "icon", "iconSizeSmall", "iconSizeMedium", "iconSizeLarge"]);
const ButtonGroupContext = /* @__PURE__ */ reactExports.createContext({});
const ButtonGroupButtonContext = /* @__PURE__ */ reactExports.createContext(void 0);
const _excluded$1e = ["children", "color", "component", "className", "disabled", "disableElevation", "disableFocusRipple", "endIcon", "focusVisibleClassName", "fullWidth", "size", "startIcon", "type", "variant"];
const useUtilityClasses$18 = (ownerState) => {
  const {
    color: color2,
    disableElevation,
    fullWidth,
    size,
    variant,
    classes
  } = ownerState;
  const slots = {
    root: ["root", variant, `${variant}${capitalize$1(color2)}`, `size${capitalize$1(size)}`, `${variant}Size${capitalize$1(size)}`, `color${capitalize$1(color2)}`, disableElevation && "disableElevation", fullWidth && "fullWidth"],
    label: ["label"],
    startIcon: ["icon", "startIcon", `iconSize${capitalize$1(size)}`],
    endIcon: ["icon", "endIcon", `iconSize${capitalize$1(size)}`]
  };
  const composedClasses = composeClasses(slots, getButtonUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const commonIconStyles = (ownerState) => _extends({}, ownerState.size === "small" && {
  "& > *:nth-of-type(1)": {
    fontSize: 18
  }
}, ownerState.size === "medium" && {
  "& > *:nth-of-type(1)": {
    fontSize: 20
  }
}, ownerState.size === "large" && {
  "& > *:nth-of-type(1)": {
    fontSize: 22
  }
});
const ButtonRoot = styled(ButtonBase, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiButton",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], styles2[`${ownerState.variant}${capitalize$1(ownerState.color)}`], styles2[`size${capitalize$1(ownerState.size)}`], styles2[`${ownerState.variant}Size${capitalize$1(ownerState.size)}`], ownerState.color === "inherit" && styles2.colorInherit, ownerState.disableElevation && styles2.disableElevation, ownerState.fullWidth && styles2.fullWidth];
  }
})(({
  theme,
  ownerState
}) => {
  var _theme$palette$getCon, _theme$palette;
  const inheritContainedBackgroundColor = theme.palette.mode === "light" ? theme.palette.grey[300] : theme.palette.grey[800];
  const inheritContainedHoverBackgroundColor = theme.palette.mode === "light" ? theme.palette.grey.A100 : theme.palette.grey[700];
  return _extends({}, theme.typography.button, {
    minWidth: 64,
    padding: "6px 16px",
    borderRadius: (theme.vars || theme).shape.borderRadius,
    transition: theme.transitions.create(["background-color", "box-shadow", "border-color", "color"], {
      duration: theme.transitions.duration.short
    }),
    "&:hover": _extends({
      textDecoration: "none",
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.text.primaryChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette.text.primary, theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    }, ownerState.variant === "text" && ownerState.color !== "inherit" && {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette[ownerState.color].main, theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    }, ownerState.variant === "outlined" && ownerState.color !== "inherit" && {
      border: `1px solid ${(theme.vars || theme).palette[ownerState.color].main}`,
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette[ownerState.color].main, theme.palette.action.hoverOpacity),
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    }, ownerState.variant === "contained" && {
      backgroundColor: theme.vars ? theme.vars.palette.Button.inheritContainedHoverBg : inheritContainedHoverBackgroundColor,
      boxShadow: (theme.vars || theme).shadows[4],
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        boxShadow: (theme.vars || theme).shadows[2],
        backgroundColor: (theme.vars || theme).palette.grey[300]
      }
    }, ownerState.variant === "contained" && ownerState.color !== "inherit" && {
      backgroundColor: (theme.vars || theme).palette[ownerState.color].dark,
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: (theme.vars || theme).palette[ownerState.color].main
      }
    }),
    "&:active": _extends({}, ownerState.variant === "contained" && {
      boxShadow: (theme.vars || theme).shadows[8]
    }),
    [`&.${buttonClasses.focusVisible}`]: _extends({}, ownerState.variant === "contained" && {
      boxShadow: (theme.vars || theme).shadows[6]
    }),
    [`&.${buttonClasses.disabled}`]: _extends({
      color: (theme.vars || theme).palette.action.disabled
    }, ownerState.variant === "outlined" && {
      border: `1px solid ${(theme.vars || theme).palette.action.disabledBackground}`
    }, ownerState.variant === "contained" && {
      color: (theme.vars || theme).palette.action.disabled,
      boxShadow: (theme.vars || theme).shadows[0],
      backgroundColor: (theme.vars || theme).palette.action.disabledBackground
    })
  }, ownerState.variant === "text" && {
    padding: "6px 8px"
  }, ownerState.variant === "text" && ownerState.color !== "inherit" && {
    color: (theme.vars || theme).palette[ownerState.color].main
  }, ownerState.variant === "outlined" && {
    padding: "5px 15px",
    border: "1px solid currentColor"
  }, ownerState.variant === "outlined" && ownerState.color !== "inherit" && {
    color: (theme.vars || theme).palette[ownerState.color].main,
    border: theme.vars ? `1px solid rgba(${theme.vars.palette[ownerState.color].mainChannel} / 0.5)` : `1px solid ${alpha_1(theme.palette[ownerState.color].main, 0.5)}`
  }, ownerState.variant === "contained" && {
    color: theme.vars ? (
      // this is safe because grey does not change between default light/dark mode
      theme.vars.palette.text.primary
    ) : (_theme$palette$getCon = (_theme$palette = theme.palette).getContrastText) == null ? void 0 : _theme$palette$getCon.call(_theme$palette, theme.palette.grey[300]),
    backgroundColor: theme.vars ? theme.vars.palette.Button.inheritContainedBg : inheritContainedBackgroundColor,
    boxShadow: (theme.vars || theme).shadows[2]
  }, ownerState.variant === "contained" && ownerState.color !== "inherit" && {
    color: (theme.vars || theme).palette[ownerState.color].contrastText,
    backgroundColor: (theme.vars || theme).palette[ownerState.color].main
  }, ownerState.color === "inherit" && {
    color: "inherit",
    borderColor: "currentColor"
  }, ownerState.size === "small" && ownerState.variant === "text" && {
    padding: "4px 5px",
    fontSize: theme.typography.pxToRem(13)
  }, ownerState.size === "large" && ownerState.variant === "text" && {
    padding: "8px 11px",
    fontSize: theme.typography.pxToRem(15)
  }, ownerState.size === "small" && ownerState.variant === "outlined" && {
    padding: "3px 9px",
    fontSize: theme.typography.pxToRem(13)
  }, ownerState.size === "large" && ownerState.variant === "outlined" && {
    padding: "7px 21px",
    fontSize: theme.typography.pxToRem(15)
  }, ownerState.size === "small" && ownerState.variant === "contained" && {
    padding: "4px 10px",
    fontSize: theme.typography.pxToRem(13)
  }, ownerState.size === "large" && ownerState.variant === "contained" && {
    padding: "8px 22px",
    fontSize: theme.typography.pxToRem(15)
  }, ownerState.fullWidth && {
    width: "100%"
  });
}, ({
  ownerState
}) => ownerState.disableElevation && {
  boxShadow: "none",
  "&:hover": {
    boxShadow: "none"
  },
  [`&.${buttonClasses.focusVisible}`]: {
    boxShadow: "none"
  },
  "&:active": {
    boxShadow: "none"
  },
  [`&.${buttonClasses.disabled}`]: {
    boxShadow: "none"
  }
});
const ButtonStartIcon = styled("span", {
  name: "MuiButton",
  slot: "StartIcon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.startIcon, styles2[`iconSize${capitalize$1(ownerState.size)}`]];
  }
})(({
  ownerState
}) => _extends({
  display: "inherit",
  marginRight: 8,
  marginLeft: -4
}, ownerState.size === "small" && {
  marginLeft: -2
}, commonIconStyles(ownerState)));
const ButtonEndIcon = styled("span", {
  name: "MuiButton",
  slot: "EndIcon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.endIcon, styles2[`iconSize${capitalize$1(ownerState.size)}`]];
  }
})(({
  ownerState
}) => _extends({
  display: "inherit",
  marginRight: -4,
  marginLeft: 8
}, ownerState.size === "small" && {
  marginRight: -2
}, commonIconStyles(ownerState)));
const Button = /* @__PURE__ */ reactExports.forwardRef(function Button2(inProps, ref) {
  const contextProps = reactExports.useContext(ButtonGroupContext);
  const buttonGroupButtonContextPositionClassName = reactExports.useContext(ButtonGroupButtonContext);
  const resolvedProps = resolveProps(contextProps, inProps);
  const props = useThemeProps$a({
    props: resolvedProps,
    name: "MuiButton"
  });
  const {
    children,
    color: color2 = "primary",
    component = "button",
    className,
    disabled = false,
    disableElevation = false,
    disableFocusRipple = false,
    endIcon: endIconProp,
    focusVisibleClassName,
    fullWidth = false,
    size = "medium",
    startIcon: startIconProp,
    type,
    variant = "text"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1e);
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    disabled,
    disableElevation,
    disableFocusRipple,
    fullWidth,
    size,
    type,
    variant
  });
  const classes = useUtilityClasses$18(ownerState);
  const startIcon = startIconProp && /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonStartIcon, {
    className: classes.startIcon,
    ownerState,
    children: startIconProp
  });
  const endIcon = endIconProp && /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonEndIcon, {
    className: classes.endIcon,
    ownerState,
    children: endIconProp
  });
  const positionClassName = buttonGroupButtonContextPositionClassName || "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ButtonRoot, _extends({
    ownerState,
    className: clsx(contextProps.className, classes.root, className, positionClassName),
    component,
    disabled,
    focusRipple: !disableFocusRipple,
    focusVisibleClassName: clsx(classes.focusVisible, focusVisibleClassName),
    ref,
    type
  }, other, {
    classes,
    children: [startIcon, children, endIcon]
  }));
});
const buildWarning = (message, gravity = "warning") => {
  let alreadyWarned = false;
  const cleanMessage = Array.isArray(message) ? message.join("\n") : message;
  return () => {
    if (!alreadyWarned) {
      alreadyWarned = true;
      if (gravity === "error") {
        console.error(cleanMessage);
      } else {
        console.warn(cleanMessage);
      }
    }
  };
};
function getDialogActionsUtilityClass(slot) {
  return generateUtilityClass$2("MuiDialogActions", slot);
}
generateUtilityClasses("MuiDialogActions", ["root", "spacing"]);
const _excluded$1d = ["className", "disableSpacing"];
const useUtilityClasses$17 = (ownerState) => {
  const {
    classes,
    disableSpacing
  } = ownerState;
  const slots = {
    root: ["root", !disableSpacing && "spacing"]
  };
  return composeClasses(slots, getDialogActionsUtilityClass, classes);
};
const DialogActionsRoot = styled("div", {
  name: "MuiDialogActions",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, !ownerState.disableSpacing && styles2.spacing];
  }
})(({
  ownerState
}) => _extends({
  display: "flex",
  alignItems: "center",
  padding: 8,
  justifyContent: "flex-end",
  flex: "0 0 auto"
}, !ownerState.disableSpacing && {
  "& > :not(style) ~ :not(style)": {
    marginLeft: 8
  }
}));
const DialogActions = /* @__PURE__ */ reactExports.forwardRef(function DialogActions2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDialogActions"
  });
  const {
    className,
    disableSpacing = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1d);
  const ownerState = _extends({}, props, {
    disableSpacing
  });
  const classes = useUtilityClasses$17(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActionsRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getListItemUtilityClass(slot) {
  return generateUtilityClass$2("MuiListItem", slot);
}
const listItemClasses = generateUtilityClasses("MuiListItem", ["root", "container", "focusVisible", "dense", "alignItemsFlexStart", "disabled", "divider", "gutters", "padding", "button", "secondaryAction", "selected"]);
function getListItemButtonUtilityClass(slot) {
  return generateUtilityClass$2("MuiListItemButton", slot);
}
const listItemButtonClasses = generateUtilityClasses("MuiListItemButton", ["root", "focusVisible", "dense", "alignItemsFlexStart", "disabled", "divider", "gutters", "selected"]);
const _excluded$1c = ["alignItems", "autoFocus", "component", "children", "dense", "disableGutters", "divider", "focusVisibleClassName", "selected", "className"];
const overridesResolver$3 = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, ownerState.dense && styles2.dense, ownerState.alignItems === "flex-start" && styles2.alignItemsFlexStart, ownerState.divider && styles2.divider, !ownerState.disableGutters && styles2.gutters];
};
const useUtilityClasses$16 = (ownerState) => {
  const {
    alignItems,
    classes,
    dense,
    disabled,
    disableGutters,
    divider,
    selected
  } = ownerState;
  const slots = {
    root: ["root", dense && "dense", !disableGutters && "gutters", divider && "divider", disabled && "disabled", alignItems === "flex-start" && "alignItemsFlexStart", selected && "selected"]
  };
  const composedClasses = composeClasses(slots, getListItemButtonUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const ListItemButtonRoot = styled(ButtonBase, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiListItemButton",
  slot: "Root",
  overridesResolver: overridesResolver$3
})(({
  theme,
  ownerState
}) => _extends({
  display: "flex",
  flexGrow: 1,
  justifyContent: "flex-start",
  alignItems: "center",
  position: "relative",
  textDecoration: "none",
  minWidth: 0,
  boxSizing: "border-box",
  textAlign: "left",
  paddingTop: 8,
  paddingBottom: 8,
  transition: theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest
  }),
  "&:hover": {
    textDecoration: "none",
    backgroundColor: (theme.vars || theme).palette.action.hover,
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  },
  [`&.${listItemButtonClasses.selected}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    [`&.${listItemButtonClasses.focusVisible}`]: {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
    }
  },
  [`&.${listItemButtonClasses.selected}:hover`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity)
    }
  },
  [`&.${listItemButtonClasses.focusVisible}`]: {
    backgroundColor: (theme.vars || theme).palette.action.focus
  },
  [`&.${listItemButtonClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity
  }
}, ownerState.divider && {
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
  backgroundClip: "padding-box"
}, ownerState.alignItems === "flex-start" && {
  alignItems: "flex-start"
}, !ownerState.disableGutters && {
  paddingLeft: 16,
  paddingRight: 16
}, ownerState.dense && {
  paddingTop: 4,
  paddingBottom: 4
}));
const ListItemButton = /* @__PURE__ */ reactExports.forwardRef(function ListItemButton2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListItemButton"
  });
  const {
    alignItems = "center",
    autoFocus = false,
    component = "div",
    children,
    dense = false,
    disableGutters = false,
    divider = false,
    focusVisibleClassName,
    selected = false,
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1c);
  const context = reactExports.useContext(ListContext);
  const childContext = reactExports.useMemo(() => ({
    dense: dense || context.dense || false,
    alignItems,
    disableGutters
  }), [alignItems, context.dense, dense, disableGutters]);
  const listItemRef = reactExports.useRef(null);
  useEnhancedEffect(() => {
    if (autoFocus) {
      if (listItemRef.current) {
        listItemRef.current.focus();
      }
    }
  }, [autoFocus]);
  const ownerState = _extends({}, props, {
    alignItems,
    dense: childContext.dense,
    disableGutters,
    divider,
    selected
  });
  const classes = useUtilityClasses$16(ownerState);
  const handleRef = useForkRef(listItemRef, ref);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListContext.Provider, {
    value: childContext,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemButtonRoot, _extends({
      ref: handleRef,
      href: other.href || other.to,
      component: (other.href || other.to) && component === "div" ? "button" : component,
      focusVisibleClassName: clsx(classes.focusVisible, focusVisibleClassName),
      ownerState,
      className: clsx(classes.root, className)
    }, other, {
      classes,
      children
    }))
  });
});
function getListItemSecondaryActionClassesUtilityClass(slot) {
  return generateUtilityClass$2("MuiListItemSecondaryAction", slot);
}
generateUtilityClasses("MuiListItemSecondaryAction", ["root", "disableGutters"]);
const _excluded$1b = ["className"];
const useUtilityClasses$15 = (ownerState) => {
  const {
    disableGutters,
    classes
  } = ownerState;
  const slots = {
    root: ["root", disableGutters && "disableGutters"]
  };
  return composeClasses(slots, getListItemSecondaryActionClassesUtilityClass, classes);
};
const ListItemSecondaryActionRoot = styled("div", {
  name: "MuiListItemSecondaryAction",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.disableGutters && styles2.disableGutters];
  }
})(({
  ownerState
}) => _extends({
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)"
}, ownerState.disableGutters && {
  right: 0
}));
const ListItemSecondaryAction = /* @__PURE__ */ reactExports.forwardRef(function ListItemSecondaryAction2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListItemSecondaryAction"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1b);
  const context = reactExports.useContext(ListContext);
  const ownerState = _extends({}, props, {
    disableGutters: context.disableGutters
  });
  const classes = useUtilityClasses$15(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemSecondaryActionRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
ListItemSecondaryAction.muiName = "ListItemSecondaryAction";
const _excluded$1a = ["className"], _excluded2$7 = ["alignItems", "autoFocus", "button", "children", "className", "component", "components", "componentsProps", "ContainerComponent", "ContainerProps", "dense", "disabled", "disableGutters", "disablePadding", "divider", "focusVisibleClassName", "secondaryAction", "selected", "slotProps", "slots"];
const overridesResolver$2 = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, ownerState.dense && styles2.dense, ownerState.alignItems === "flex-start" && styles2.alignItemsFlexStart, ownerState.divider && styles2.divider, !ownerState.disableGutters && styles2.gutters, !ownerState.disablePadding && styles2.padding, ownerState.button && styles2.button, ownerState.hasSecondaryAction && styles2.secondaryAction];
};
const useUtilityClasses$14 = (ownerState) => {
  const {
    alignItems,
    button,
    classes,
    dense,
    disabled,
    disableGutters,
    disablePadding,
    divider,
    hasSecondaryAction,
    selected
  } = ownerState;
  const slots = {
    root: ["root", dense && "dense", !disableGutters && "gutters", !disablePadding && "padding", divider && "divider", disabled && "disabled", button && "button", alignItems === "flex-start" && "alignItemsFlexStart", hasSecondaryAction && "secondaryAction", selected && "selected"],
    container: ["container"]
  };
  return composeClasses(slots, getListItemUtilityClass, classes);
};
const ListItemRoot = styled("div", {
  name: "MuiListItem",
  slot: "Root",
  overridesResolver: overridesResolver$2
})(({
  theme,
  ownerState
}) => _extends({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  position: "relative",
  textDecoration: "none",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "left"
}, !ownerState.disablePadding && _extends({
  paddingTop: 8,
  paddingBottom: 8
}, ownerState.dense && {
  paddingTop: 4,
  paddingBottom: 4
}, !ownerState.disableGutters && {
  paddingLeft: 16,
  paddingRight: 16
}, !!ownerState.secondaryAction && {
  // Add some space to avoid collision as `ListItemSecondaryAction`
  // is absolutely positioned.
  paddingRight: 48
}), !!ownerState.secondaryAction && {
  [`& > .${listItemButtonClasses.root}`]: {
    paddingRight: 48
  }
}, {
  [`&.${listItemClasses.focusVisible}`]: {
    backgroundColor: (theme.vars || theme).palette.action.focus
  },
  [`&.${listItemClasses.selected}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    [`&.${listItemClasses.focusVisible}`]: {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
    }
  },
  [`&.${listItemClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity
  }
}, ownerState.alignItems === "flex-start" && {
  alignItems: "flex-start"
}, ownerState.divider && {
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
  backgroundClip: "padding-box"
}, ownerState.button && {
  transition: theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest
  }),
  "&:hover": {
    textDecoration: "none",
    backgroundColor: (theme.vars || theme).palette.action.hover,
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  },
  [`&.${listItemClasses.selected}:hover`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity)
    }
  }
}, ownerState.hasSecondaryAction && {
  // Add some space to avoid collision as `ListItemSecondaryAction`
  // is absolutely positioned.
  paddingRight: 48
}));
const ListItemContainer = styled("li", {
  name: "MuiListItem",
  slot: "Container",
  overridesResolver: (props, styles2) => styles2.container
})({
  position: "relative"
});
const ListItem = /* @__PURE__ */ reactExports.forwardRef(function ListItem2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListItem"
  });
  const {
    alignItems = "center",
    autoFocus = false,
    button = false,
    children: childrenProp,
    className,
    component: componentProp,
    components = {},
    componentsProps = {},
    ContainerComponent = "li",
    ContainerProps: {
      className: ContainerClassName
    } = {},
    dense = false,
    disabled = false,
    disableGutters = false,
    disablePadding = false,
    divider = false,
    focusVisibleClassName,
    secondaryAction,
    selected = false,
    slotProps = {},
    slots = {}
  } = props, ContainerProps = _objectWithoutPropertiesLoose(props.ContainerProps, _excluded$1a), other = _objectWithoutPropertiesLoose(props, _excluded2$7);
  const context = reactExports.useContext(ListContext);
  const childContext = reactExports.useMemo(() => ({
    dense: dense || context.dense || false,
    alignItems,
    disableGutters
  }), [alignItems, context.dense, dense, disableGutters]);
  const listItemRef = reactExports.useRef(null);
  useEnhancedEffect(() => {
    if (autoFocus) {
      if (listItemRef.current) {
        listItemRef.current.focus();
      }
    }
  }, [autoFocus]);
  const children = reactExports.Children.toArray(childrenProp);
  const hasSecondaryAction = children.length && isMuiElement(children[children.length - 1], ["ListItemSecondaryAction"]);
  const ownerState = _extends({}, props, {
    alignItems,
    autoFocus,
    button,
    dense: childContext.dense,
    disabled,
    disableGutters,
    disablePadding,
    divider,
    hasSecondaryAction,
    selected
  });
  const classes = useUtilityClasses$14(ownerState);
  const handleRef = useForkRef(listItemRef, ref);
  const Root = slots.root || components.Root || ListItemRoot;
  const rootProps = slotProps.root || componentsProps.root || {};
  const componentProps = _extends({
    className: clsx(classes.root, rootProps.className, className),
    disabled
  }, other);
  let Component = componentProp || "li";
  if (button) {
    componentProps.component = componentProp || "div";
    componentProps.focusVisibleClassName = clsx(listItemClasses.focusVisible, focusVisibleClassName);
    Component = ButtonBase;
  }
  if (hasSecondaryAction) {
    Component = !componentProps.component && !componentProp ? "div" : Component;
    if (ContainerComponent === "li") {
      if (Component === "li") {
        Component = "div";
      } else if (componentProps.component === "li") {
        componentProps.component = "div";
      }
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ListContext.Provider, {
      value: childContext,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ListItemContainer, _extends({
        as: ContainerComponent,
        className: clsx(classes.container, ContainerClassName),
        ref: handleRef,
        ownerState
      }, ContainerProps, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Root, _extends({}, rootProps, !isHostComponent(Root) && {
          as: Component,
          ownerState: _extends({}, ownerState, rootProps.ownerState)
        }, componentProps, {
          children
        })), children.pop()]
      }))
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListContext.Provider, {
    value: childContext,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Root, _extends({}, rootProps, {
      as: Component,
      ref: handleRef
    }, !isHostComponent(Root) && {
      ownerState: _extends({}, ownerState, rootProps.ownerState)
    }, componentProps, {
      children: [children, secondaryAction && /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemSecondaryAction, {
        children: secondaryAction
      })]
    }))
  });
});
const CancelIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
}), "Cancel");
function getChipUtilityClass(slot) {
  return generateUtilityClass$2("MuiChip", slot);
}
const chipClasses = generateUtilityClasses("MuiChip", ["root", "sizeSmall", "sizeMedium", "colorError", "colorInfo", "colorPrimary", "colorSecondary", "colorSuccess", "colorWarning", "disabled", "clickable", "clickableColorPrimary", "clickableColorSecondary", "deletable", "deletableColorPrimary", "deletableColorSecondary", "outlined", "filled", "outlinedPrimary", "outlinedSecondary", "filledPrimary", "filledSecondary", "avatar", "avatarSmall", "avatarMedium", "avatarColorPrimary", "avatarColorSecondary", "icon", "iconSmall", "iconMedium", "iconColorPrimary", "iconColorSecondary", "label", "labelSmall", "labelMedium", "deleteIcon", "deleteIconSmall", "deleteIconMedium", "deleteIconColorPrimary", "deleteIconColorSecondary", "deleteIconOutlinedColorPrimary", "deleteIconOutlinedColorSecondary", "deleteIconFilledColorPrimary", "deleteIconFilledColorSecondary", "focusVisible"]);
const _excluded$19 = ["avatar", "className", "clickable", "color", "component", "deleteIcon", "disabled", "icon", "label", "onClick", "onDelete", "onKeyDown", "onKeyUp", "size", "variant", "tabIndex", "skipFocusWhenDisabled"];
const useUtilityClasses$13 = (ownerState) => {
  const {
    classes,
    disabled,
    size,
    color: color2,
    iconColor,
    onDelete,
    clickable,
    variant
  } = ownerState;
  const slots = {
    root: ["root", variant, disabled && "disabled", `size${capitalize$1(size)}`, `color${capitalize$1(color2)}`, clickable && "clickable", clickable && `clickableColor${capitalize$1(color2)}`, onDelete && "deletable", onDelete && `deletableColor${capitalize$1(color2)}`, `${variant}${capitalize$1(color2)}`],
    label: ["label", `label${capitalize$1(size)}`],
    avatar: ["avatar", `avatar${capitalize$1(size)}`, `avatarColor${capitalize$1(color2)}`],
    icon: ["icon", `icon${capitalize$1(size)}`, `iconColor${capitalize$1(iconColor)}`],
    deleteIcon: ["deleteIcon", `deleteIcon${capitalize$1(size)}`, `deleteIconColor${capitalize$1(color2)}`, `deleteIcon${capitalize$1(variant)}Color${capitalize$1(color2)}`]
  };
  return composeClasses(slots, getChipUtilityClass, classes);
};
const ChipRoot = styled("div", {
  name: "MuiChip",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    const {
      color: color2,
      iconColor,
      clickable,
      onDelete,
      size,
      variant
    } = ownerState;
    return [{
      [`& .${chipClasses.avatar}`]: styles2.avatar
    }, {
      [`& .${chipClasses.avatar}`]: styles2[`avatar${capitalize$1(size)}`]
    }, {
      [`& .${chipClasses.avatar}`]: styles2[`avatarColor${capitalize$1(color2)}`]
    }, {
      [`& .${chipClasses.icon}`]: styles2.icon
    }, {
      [`& .${chipClasses.icon}`]: styles2[`icon${capitalize$1(size)}`]
    }, {
      [`& .${chipClasses.icon}`]: styles2[`iconColor${capitalize$1(iconColor)}`]
    }, {
      [`& .${chipClasses.deleteIcon}`]: styles2.deleteIcon
    }, {
      [`& .${chipClasses.deleteIcon}`]: styles2[`deleteIcon${capitalize$1(size)}`]
    }, {
      [`& .${chipClasses.deleteIcon}`]: styles2[`deleteIconColor${capitalize$1(color2)}`]
    }, {
      [`& .${chipClasses.deleteIcon}`]: styles2[`deleteIcon${capitalize$1(variant)}Color${capitalize$1(color2)}`]
    }, styles2.root, styles2[`size${capitalize$1(size)}`], styles2[`color${capitalize$1(color2)}`], clickable && styles2.clickable, clickable && color2 !== "default" && styles2[`clickableColor${capitalize$1(color2)})`], onDelete && styles2.deletable, onDelete && color2 !== "default" && styles2[`deletableColor${capitalize$1(color2)}`], styles2[variant], styles2[`${variant}${capitalize$1(color2)}`]];
  }
})(({
  theme,
  ownerState
}) => {
  const textColor = theme.palette.mode === "light" ? theme.palette.grey[700] : theme.palette.grey[300];
  return _extends({
    maxWidth: "100%",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.pxToRem(13),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    color: (theme.vars || theme).palette.text.primary,
    backgroundColor: (theme.vars || theme).palette.action.selected,
    borderRadius: 32 / 2,
    whiteSpace: "nowrap",
    transition: theme.transitions.create(["background-color", "box-shadow"]),
    // reset cursor explicitly in case ButtonBase is used
    cursor: "unset",
    // We disable the focus ring for mouse, touch and keyboard users.
    outline: 0,
    textDecoration: "none",
    border: 0,
    // Remove `button` border
    padding: 0,
    // Remove `button` padding
    verticalAlign: "middle",
    boxSizing: "border-box",
    [`&.${chipClasses.disabled}`]: {
      opacity: (theme.vars || theme).palette.action.disabledOpacity,
      pointerEvents: "none"
    },
    [`& .${chipClasses.avatar}`]: {
      marginLeft: 5,
      marginRight: -6,
      width: 24,
      height: 24,
      color: theme.vars ? theme.vars.palette.Chip.defaultAvatarColor : textColor,
      fontSize: theme.typography.pxToRem(12)
    },
    [`& .${chipClasses.avatarColorPrimary}`]: {
      color: (theme.vars || theme).palette.primary.contrastText,
      backgroundColor: (theme.vars || theme).palette.primary.dark
    },
    [`& .${chipClasses.avatarColorSecondary}`]: {
      color: (theme.vars || theme).palette.secondary.contrastText,
      backgroundColor: (theme.vars || theme).palette.secondary.dark
    },
    [`& .${chipClasses.avatarSmall}`]: {
      marginLeft: 4,
      marginRight: -4,
      width: 18,
      height: 18,
      fontSize: theme.typography.pxToRem(10)
    },
    [`& .${chipClasses.icon}`]: _extends({
      marginLeft: 5,
      marginRight: -6
    }, ownerState.size === "small" && {
      fontSize: 18,
      marginLeft: 4,
      marginRight: -4
    }, ownerState.iconColor === ownerState.color && _extends({
      color: theme.vars ? theme.vars.palette.Chip.defaultIconColor : textColor
    }, ownerState.color !== "default" && {
      color: "inherit"
    })),
    [`& .${chipClasses.deleteIcon}`]: _extends({
      WebkitTapHighlightColor: "transparent",
      color: theme.vars ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.26)` : alpha_1(theme.palette.text.primary, 0.26),
      fontSize: 22,
      cursor: "pointer",
      margin: "0 5px 0 -6px",
      "&:hover": {
        color: theme.vars ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.4)` : alpha_1(theme.palette.text.primary, 0.4)
      }
    }, ownerState.size === "small" && {
      fontSize: 16,
      marginRight: 4,
      marginLeft: -4
    }, ownerState.color !== "default" && {
      color: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].contrastTextChannel} / 0.7)` : alpha_1(theme.palette[ownerState.color].contrastText, 0.7),
      "&:hover, &:active": {
        color: (theme.vars || theme).palette[ownerState.color].contrastText
      }
    })
  }, ownerState.size === "small" && {
    height: 24
  }, ownerState.color !== "default" && {
    backgroundColor: (theme.vars || theme).palette[ownerState.color].main,
    color: (theme.vars || theme).palette[ownerState.color].contrastText
  }, ownerState.onDelete && {
    [`&.${chipClasses.focusVisible}`]: {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.action.selectedChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.action.selected, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
    }
  }, ownerState.onDelete && ownerState.color !== "default" && {
    [`&.${chipClasses.focusVisible}`]: {
      backgroundColor: (theme.vars || theme).palette[ownerState.color].dark
    }
  });
}, ({
  theme,
  ownerState
}) => _extends({}, ownerState.clickable && {
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.action.selectedChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.action.selected, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity)
  },
  [`&.${chipClasses.focusVisible}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.action.selectedChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.action.selected, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
  },
  "&:active": {
    boxShadow: (theme.vars || theme).shadows[1]
  }
}, ownerState.clickable && ownerState.color !== "default" && {
  [`&:hover, &.${chipClasses.focusVisible}`]: {
    backgroundColor: (theme.vars || theme).palette[ownerState.color].dark
  }
}), ({
  theme,
  ownerState
}) => _extends({}, ownerState.variant === "outlined" && {
  backgroundColor: "transparent",
  border: theme.vars ? `1px solid ${theme.vars.palette.Chip.defaultBorder}` : `1px solid ${theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700]}`,
  [`&.${chipClasses.clickable}:hover`]: {
    backgroundColor: (theme.vars || theme).palette.action.hover
  },
  [`&.${chipClasses.focusVisible}`]: {
    backgroundColor: (theme.vars || theme).palette.action.focus
  },
  [`& .${chipClasses.avatar}`]: {
    marginLeft: 4
  },
  [`& .${chipClasses.avatarSmall}`]: {
    marginLeft: 2
  },
  [`& .${chipClasses.icon}`]: {
    marginLeft: 4
  },
  [`& .${chipClasses.iconSmall}`]: {
    marginLeft: 2
  },
  [`& .${chipClasses.deleteIcon}`]: {
    marginRight: 5
  },
  [`& .${chipClasses.deleteIconSmall}`]: {
    marginRight: 3
  }
}, ownerState.variant === "outlined" && ownerState.color !== "default" && {
  color: (theme.vars || theme).palette[ownerState.color].main,
  border: `1px solid ${theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / 0.7)` : alpha_1(theme.palette[ownerState.color].main, 0.7)}`,
  [`&.${chipClasses.clickable}:hover`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette[ownerState.color].main, theme.palette.action.hoverOpacity)
  },
  [`&.${chipClasses.focusVisible}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.focusOpacity})` : alpha_1(theme.palette[ownerState.color].main, theme.palette.action.focusOpacity)
  },
  [`& .${chipClasses.deleteIcon}`]: {
    color: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / 0.7)` : alpha_1(theme.palette[ownerState.color].main, 0.7),
    "&:hover, &:active": {
      color: (theme.vars || theme).palette[ownerState.color].main
    }
  }
}));
const ChipLabel = styled("span", {
  name: "MuiChip",
  slot: "Label",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    const {
      size
    } = ownerState;
    return [styles2.label, styles2[`label${capitalize$1(size)}`]];
  }
})(({
  ownerState
}) => _extends({
  overflow: "hidden",
  textOverflow: "ellipsis",
  paddingLeft: 12,
  paddingRight: 12,
  whiteSpace: "nowrap"
}, ownerState.variant === "outlined" && {
  paddingLeft: 11,
  paddingRight: 11
}, ownerState.size === "small" && {
  paddingLeft: 8,
  paddingRight: 8
}, ownerState.size === "small" && ownerState.variant === "outlined" && {
  paddingLeft: 7,
  paddingRight: 7
}));
function isDeleteKeyboardEvent(keyboardEvent) {
  return keyboardEvent.key === "Backspace" || keyboardEvent.key === "Delete";
}
const Chip = /* @__PURE__ */ reactExports.forwardRef(function Chip2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiChip"
  });
  const {
    avatar: avatarProp,
    className,
    clickable: clickableProp,
    color: color2 = "default",
    component: ComponentProp,
    deleteIcon: deleteIconProp,
    disabled = false,
    icon: iconProp,
    label,
    onClick,
    onDelete,
    onKeyDown,
    onKeyUp,
    size = "medium",
    variant = "filled",
    tabIndex,
    skipFocusWhenDisabled = false
    // TODO v6: Rename to `focusableWhenDisabled`.
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$19);
  const chipRef = reactExports.useRef(null);
  const handleRef = useForkRef(chipRef, ref);
  const handleDeleteIconClick = (event) => {
    event.stopPropagation();
    if (onDelete) {
      onDelete(event);
    }
  };
  const handleKeyDown2 = (event) => {
    if (event.currentTarget === event.target && isDeleteKeyboardEvent(event)) {
      event.preventDefault();
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
  };
  const handleKeyUp = (event) => {
    if (event.currentTarget === event.target) {
      if (onDelete && isDeleteKeyboardEvent(event)) {
        onDelete(event);
      } else if (event.key === "Escape" && chipRef.current) {
        chipRef.current.blur();
      }
    }
    if (onKeyUp) {
      onKeyUp(event);
    }
  };
  const clickable = clickableProp !== false && onClick ? true : clickableProp;
  const component = clickable || onDelete ? ButtonBase : ComponentProp || "div";
  const ownerState = _extends({}, props, {
    component,
    disabled,
    size,
    color: color2,
    iconColor: /* @__PURE__ */ reactExports.isValidElement(iconProp) ? iconProp.props.color || color2 : color2,
    onDelete: !!onDelete,
    clickable,
    variant
  });
  const classes = useUtilityClasses$13(ownerState);
  const moreProps = component === ButtonBase ? _extends({
    component: ComponentProp || "div",
    focusVisibleClassName: classes.focusVisible
  }, onDelete && {
    disableRipple: true
  }) : {};
  let deleteIcon = null;
  if (onDelete) {
    deleteIcon = deleteIconProp && /* @__PURE__ */ reactExports.isValidElement(deleteIconProp) ? /* @__PURE__ */ reactExports.cloneElement(deleteIconProp, {
      className: clsx(deleteIconProp.props.className, classes.deleteIcon),
      onClick: handleDeleteIconClick
    }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CancelIcon, {
      className: clsx(classes.deleteIcon),
      onClick: handleDeleteIconClick
    });
  }
  let avatar = null;
  if (avatarProp && /* @__PURE__ */ reactExports.isValidElement(avatarProp)) {
    avatar = /* @__PURE__ */ reactExports.cloneElement(avatarProp, {
      className: clsx(classes.avatar, avatarProp.props.className)
    });
  }
  let icon = null;
  if (iconProp && /* @__PURE__ */ reactExports.isValidElement(iconProp)) {
    icon = /* @__PURE__ */ reactExports.cloneElement(iconProp, {
      className: clsx(classes.icon, iconProp.props.className)
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ChipRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    disabled: clickable && disabled ? true : void 0,
    onClick,
    onKeyDown: handleKeyDown2,
    onKeyUp: handleKeyUp,
    ref: handleRef,
    tabIndex: skipFocusWhenDisabled && disabled ? -1 : tabIndex,
    ownerState
  }, moreProps, other, {
    children: [avatar || icon, /* @__PURE__ */ jsxRuntimeExports.jsx(ChipLabel, {
      className: clsx(classes.label),
      ownerState,
      children: label
    }), deleteIcon]
  }));
});
function getTabUtilityClass(slot) {
  return generateUtilityClass$2("MuiTab", slot);
}
const tabClasses = generateUtilityClasses("MuiTab", ["root", "labelIcon", "textColorInherit", "textColorPrimary", "textColorSecondary", "selected", "disabled", "fullWidth", "wrapped", "iconWrapper"]);
const _excluded$18 = ["className", "disabled", "disableFocusRipple", "fullWidth", "icon", "iconPosition", "indicator", "label", "onChange", "onClick", "onFocus", "selected", "selectionFollowsFocus", "textColor", "value", "wrapped"];
const useUtilityClasses$12 = (ownerState) => {
  const {
    classes,
    textColor,
    fullWidth,
    wrapped,
    icon,
    label,
    selected,
    disabled
  } = ownerState;
  const slots = {
    root: ["root", icon && label && "labelIcon", `textColor${capitalize$1(textColor)}`, fullWidth && "fullWidth", wrapped && "wrapped", selected && "selected", disabled && "disabled"],
    iconWrapper: ["iconWrapper"]
  };
  return composeClasses(slots, getTabUtilityClass, classes);
};
const TabRoot = styled(ButtonBase, {
  name: "MuiTab",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.label && ownerState.icon && styles2.labelIcon, styles2[`textColor${capitalize$1(ownerState.textColor)}`], ownerState.fullWidth && styles2.fullWidth, ownerState.wrapped && styles2.wrapped];
  }
})(({
  theme,
  ownerState
}) => _extends({}, theme.typography.button, {
  maxWidth: 360,
  minWidth: 90,
  position: "relative",
  minHeight: 48,
  flexShrink: 0,
  padding: "12px 16px",
  overflow: "hidden",
  whiteSpace: "normal",
  textAlign: "center"
}, ownerState.label && {
  flexDirection: ownerState.iconPosition === "top" || ownerState.iconPosition === "bottom" ? "column" : "row"
}, {
  lineHeight: 1.25
}, ownerState.icon && ownerState.label && {
  minHeight: 72,
  paddingTop: 9,
  paddingBottom: 9,
  [`& > .${tabClasses.iconWrapper}`]: _extends({}, ownerState.iconPosition === "top" && {
    marginBottom: 6
  }, ownerState.iconPosition === "bottom" && {
    marginTop: 6
  }, ownerState.iconPosition === "start" && {
    marginRight: theme.spacing(1)
  }, ownerState.iconPosition === "end" && {
    marginLeft: theme.spacing(1)
  })
}, ownerState.textColor === "inherit" && {
  color: "inherit",
  opacity: 0.6,
  // same opacity as theme.palette.text.secondary
  [`&.${tabClasses.selected}`]: {
    opacity: 1
  },
  [`&.${tabClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity
  }
}, ownerState.textColor === "primary" && {
  color: (theme.vars || theme).palette.text.secondary,
  [`&.${tabClasses.selected}`]: {
    color: (theme.vars || theme).palette.primary.main
  },
  [`&.${tabClasses.disabled}`]: {
    color: (theme.vars || theme).palette.text.disabled
  }
}, ownerState.textColor === "secondary" && {
  color: (theme.vars || theme).palette.text.secondary,
  [`&.${tabClasses.selected}`]: {
    color: (theme.vars || theme).palette.secondary.main
  },
  [`&.${tabClasses.disabled}`]: {
    color: (theme.vars || theme).palette.text.disabled
  }
}, ownerState.fullWidth && {
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: 0,
  maxWidth: "none"
}, ownerState.wrapped && {
  fontSize: theme.typography.pxToRem(12)
}));
const Tab = /* @__PURE__ */ reactExports.forwardRef(function Tab2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTab"
  });
  const {
    className,
    disabled = false,
    disableFocusRipple = false,
    // eslint-disable-next-line react/prop-types
    fullWidth,
    icon: iconProp,
    iconPosition = "top",
    // eslint-disable-next-line react/prop-types
    indicator,
    label,
    onChange,
    onClick,
    onFocus,
    // eslint-disable-next-line react/prop-types
    selected,
    // eslint-disable-next-line react/prop-types
    selectionFollowsFocus,
    // eslint-disable-next-line react/prop-types
    textColor = "inherit",
    value,
    wrapped = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$18);
  const ownerState = _extends({}, props, {
    disabled,
    disableFocusRipple,
    selected,
    icon: !!iconProp,
    iconPosition,
    label: !!label,
    fullWidth,
    textColor,
    wrapped
  });
  const classes = useUtilityClasses$12(ownerState);
  const icon = iconProp && label && /* @__PURE__ */ reactExports.isValidElement(iconProp) ? /* @__PURE__ */ reactExports.cloneElement(iconProp, {
    className: clsx(classes.iconWrapper, iconProp.props.className)
  }) : iconProp;
  const handleClick = (event) => {
    if (!selected && onChange) {
      onChange(event, value);
    }
    if (onClick) {
      onClick(event);
    }
  };
  const handleFocus = (event) => {
    if (selectionFollowsFocus && !selected && onChange) {
      onChange(event, value);
    }
    if (onFocus) {
      onFocus(event);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(TabRoot, _extends({
    focusRipple: !disableFocusRipple,
    className: clsx(classes.root, className),
    ref,
    role: "tab",
    "aria-selected": selected,
    disabled,
    onClick: handleClick,
    onFocus: handleFocus,
    ownerState,
    tabIndex: selected ? 0 : -1
  }, other, {
    children: [iconPosition === "top" || iconPosition === "start" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
      children: [icon, label]
    }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
      children: [label, icon]
    }), indicator]
  }));
});
function easeInOutSin(time) {
  return (1 + Math.sin(Math.PI * time - Math.PI / 2)) / 2;
}
function animate(property, element, to, options = {}, cb = () => {
}) {
  const {
    ease = easeInOutSin,
    duration: duration2 = 300
    // standard
  } = options;
  let start = null;
  const from2 = element[property];
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  const step = (timestamp) => {
    if (cancelled) {
      cb(new Error("Animation cancelled"));
      return;
    }
    if (start === null) {
      start = timestamp;
    }
    const time = Math.min(1, (timestamp - start) / duration2);
    element[property] = ease(time) * (to - from2) + from2;
    if (time >= 1) {
      requestAnimationFrame(() => {
        cb(null);
      });
      return;
    }
    requestAnimationFrame(step);
  };
  if (from2 === to) {
    cb(new Error("Element already at target position"));
    return cancel;
  }
  requestAnimationFrame(step);
  return cancel;
}
const _excluded$17 = ["onChange"];
const styles$2 = {
  width: 99,
  height: 99,
  position: "absolute",
  top: -9999,
  overflow: "scroll"
};
function ScrollbarSize(props) {
  const {
    onChange
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$17);
  const scrollbarHeight = reactExports.useRef();
  const nodeRef = reactExports.useRef(null);
  const setMeasurements = () => {
    scrollbarHeight.current = nodeRef.current.offsetHeight - nodeRef.current.clientHeight;
  };
  useEnhancedEffect(() => {
    const handleResize = debounce(() => {
      const prevHeight = scrollbarHeight.current;
      setMeasurements();
      if (prevHeight !== scrollbarHeight.current) {
        onChange(scrollbarHeight.current);
      }
    });
    const containerWindow = ownerWindow(nodeRef.current);
    containerWindow.addEventListener("resize", handleResize);
    return () => {
      handleResize.clear();
      containerWindow.removeEventListener("resize", handleResize);
    };
  }, [onChange]);
  reactExports.useEffect(() => {
    setMeasurements();
    onChange(scrollbarHeight.current);
  }, [onChange]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", _extends({
    style: styles$2,
    ref: nodeRef
  }, other));
}
const KeyboardArrowLeft$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z"
}), "KeyboardArrowLeft");
const KeyboardArrowRight$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"
}), "KeyboardArrowRight");
function getTabScrollButtonUtilityClass(slot) {
  return generateUtilityClass$2("MuiTabScrollButton", slot);
}
const tabScrollButtonClasses = generateUtilityClasses("MuiTabScrollButton", ["root", "vertical", "horizontal", "disabled"]);
const _excluded$16 = ["className", "slots", "slotProps", "direction", "orientation", "disabled"];
const useUtilityClasses$11 = (ownerState) => {
  const {
    classes,
    orientation,
    disabled
  } = ownerState;
  const slots = {
    root: ["root", orientation, disabled && "disabled"]
  };
  return composeClasses(slots, getTabScrollButtonUtilityClass, classes);
};
const TabScrollButtonRoot = styled(ButtonBase, {
  name: "MuiTabScrollButton",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.orientation && styles2[ownerState.orientation]];
  }
})(({
  ownerState
}) => _extends({
  width: 40,
  flexShrink: 0,
  opacity: 0.8,
  [`&.${tabScrollButtonClasses.disabled}`]: {
    opacity: 0
  }
}, ownerState.orientation === "vertical" && {
  width: "100%",
  height: 40,
  "& svg": {
    transform: `rotate(${ownerState.isRtl ? -90 : 90}deg)`
  }
}));
const TabScrollButton = /* @__PURE__ */ reactExports.forwardRef(function TabScrollButton2(inProps, ref) {
  var _slots$StartScrollBut, _slots$EndScrollButto;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTabScrollButton"
  });
  const {
    className,
    slots = {},
    slotProps = {},
    direction
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$16);
  const isRtl = useRtl();
  const ownerState = _extends({
    isRtl
  }, props);
  const classes = useUtilityClasses$11(ownerState);
  const StartButtonIcon = (_slots$StartScrollBut = slots.StartScrollButtonIcon) != null ? _slots$StartScrollBut : KeyboardArrowLeft$1;
  const EndButtonIcon = (_slots$EndScrollButto = slots.EndScrollButtonIcon) != null ? _slots$EndScrollButto : KeyboardArrowRight$1;
  const startButtonIconProps = useSlotProps({
    elementType: StartButtonIcon,
    externalSlotProps: slotProps.startScrollButtonIcon,
    additionalProps: {
      fontSize: "small"
    },
    ownerState
  });
  const endButtonIconProps = useSlotProps({
    elementType: EndButtonIcon,
    externalSlotProps: slotProps.endScrollButtonIcon,
    additionalProps: {
      fontSize: "small"
    },
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TabScrollButtonRoot, _extends({
    component: "div",
    className: clsx(classes.root, className),
    ref,
    role: null,
    ownerState,
    tabIndex: null
  }, other, {
    children: direction === "left" ? /* @__PURE__ */ jsxRuntimeExports.jsx(StartButtonIcon, _extends({}, startButtonIconProps)) : /* @__PURE__ */ jsxRuntimeExports.jsx(EndButtonIcon, _extends({}, endButtonIconProps))
  }));
});
function getTabsUtilityClass(slot) {
  return generateUtilityClass$2("MuiTabs", slot);
}
const tabsClasses = generateUtilityClasses("MuiTabs", ["root", "vertical", "flexContainer", "flexContainerVertical", "centered", "scroller", "fixed", "scrollableX", "scrollableY", "hideScrollbar", "scrollButtons", "scrollButtonsHideMobile", "indicator"]);
const _excluded$15 = ["aria-label", "aria-labelledby", "action", "centered", "children", "className", "component", "allowScrollButtonsMobile", "indicatorColor", "onChange", "orientation", "ScrollButtonComponent", "scrollButtons", "selectionFollowsFocus", "slots", "slotProps", "TabIndicatorProps", "TabScrollButtonProps", "textColor", "value", "variant", "visibleScrollbar"];
const nextItem = (list, item) => {
  if (list === item) {
    return list.firstChild;
  }
  if (item && item.nextElementSibling) {
    return item.nextElementSibling;
  }
  return list.firstChild;
};
const previousItem = (list, item) => {
  if (list === item) {
    return list.lastChild;
  }
  if (item && item.previousElementSibling) {
    return item.previousElementSibling;
  }
  return list.lastChild;
};
const moveFocus = (list, currentFocus, traversalFunction) => {
  let wrappedOnce = false;
  let nextFocus = traversalFunction(list, currentFocus);
  while (nextFocus) {
    if (nextFocus === list.firstChild) {
      if (wrappedOnce) {
        return;
      }
      wrappedOnce = true;
    }
    const nextFocusDisabled = nextFocus.disabled || nextFocus.getAttribute("aria-disabled") === "true";
    if (!nextFocus.hasAttribute("tabindex") || nextFocusDisabled) {
      nextFocus = traversalFunction(list, nextFocus);
    } else {
      nextFocus.focus();
      return;
    }
  }
};
const useUtilityClasses$10 = (ownerState) => {
  const {
    vertical,
    fixed,
    hideScrollbar,
    scrollableX,
    scrollableY,
    centered,
    scrollButtonsHideMobile,
    classes
  } = ownerState;
  const slots = {
    root: ["root", vertical && "vertical"],
    scroller: ["scroller", fixed && "fixed", hideScrollbar && "hideScrollbar", scrollableX && "scrollableX", scrollableY && "scrollableY"],
    flexContainer: ["flexContainer", vertical && "flexContainerVertical", centered && "centered"],
    indicator: ["indicator"],
    scrollButtons: ["scrollButtons", scrollButtonsHideMobile && "scrollButtonsHideMobile"],
    scrollableX: [scrollableX && "scrollableX"],
    hideScrollbar: [hideScrollbar && "hideScrollbar"]
  };
  return composeClasses(slots, getTabsUtilityClass, classes);
};
const TabsRoot = styled("div", {
  name: "MuiTabs",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${tabsClasses.scrollButtons}`]: styles2.scrollButtons
    }, {
      [`& .${tabsClasses.scrollButtons}`]: ownerState.scrollButtonsHideMobile && styles2.scrollButtonsHideMobile
    }, styles2.root, ownerState.vertical && styles2.vertical];
  }
})(({
  ownerState,
  theme
}) => _extends({
  overflow: "hidden",
  minHeight: 48,
  // Add iOS momentum scrolling for iOS < 13.0
  WebkitOverflowScrolling: "touch",
  display: "flex"
}, ownerState.vertical && {
  flexDirection: "column"
}, ownerState.scrollButtonsHideMobile && {
  [`& .${tabsClasses.scrollButtons}`]: {
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  }
}));
const TabsScroller = styled("div", {
  name: "MuiTabs",
  slot: "Scroller",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.scroller, ownerState.fixed && styles2.fixed, ownerState.hideScrollbar && styles2.hideScrollbar, ownerState.scrollableX && styles2.scrollableX, ownerState.scrollableY && styles2.scrollableY];
  }
})(({
  ownerState
}) => _extends({
  position: "relative",
  display: "inline-block",
  flex: "1 1 auto",
  whiteSpace: "nowrap"
}, ownerState.fixed && {
  overflowX: "hidden",
  width: "100%"
}, ownerState.hideScrollbar && {
  // Hide dimensionless scrollbar on macOS
  scrollbarWidth: "none",
  // Firefox
  "&::-webkit-scrollbar": {
    display: "none"
    // Safari + Chrome
  }
}, ownerState.scrollableX && {
  overflowX: "auto",
  overflowY: "hidden"
}, ownerState.scrollableY && {
  overflowY: "auto",
  overflowX: "hidden"
}));
const FlexContainer = styled("div", {
  name: "MuiTabs",
  slot: "FlexContainer",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.flexContainer, ownerState.vertical && styles2.flexContainerVertical, ownerState.centered && styles2.centered];
  }
})(({
  ownerState
}) => _extends({
  display: "flex"
}, ownerState.vertical && {
  flexDirection: "column"
}, ownerState.centered && {
  justifyContent: "center"
}));
const TabsIndicator = styled("span", {
  name: "MuiTabs",
  slot: "Indicator",
  overridesResolver: (props, styles2) => styles2.indicator
})(({
  ownerState,
  theme
}) => _extends({
  position: "absolute",
  height: 2,
  bottom: 0,
  width: "100%",
  transition: theme.transitions.create()
}, ownerState.indicatorColor === "primary" && {
  backgroundColor: (theme.vars || theme).palette.primary.main
}, ownerState.indicatorColor === "secondary" && {
  backgroundColor: (theme.vars || theme).palette.secondary.main
}, ownerState.vertical && {
  height: "100%",
  width: 2,
  right: 0
}));
const TabsScrollbarSize = styled(ScrollbarSize)({
  overflowX: "auto",
  overflowY: "hidden",
  // Hide dimensionless scrollbar on macOS
  scrollbarWidth: "none",
  // Firefox
  "&::-webkit-scrollbar": {
    display: "none"
    // Safari + Chrome
  }
});
const defaultIndicatorStyle = {};
const Tabs = /* @__PURE__ */ reactExports.forwardRef(function Tabs2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTabs"
  });
  const theme = useTheme$1();
  const isRtl = useRtl();
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    action,
    centered = false,
    children: childrenProp,
    className,
    component = "div",
    allowScrollButtonsMobile = false,
    indicatorColor = "primary",
    onChange,
    orientation = "horizontal",
    ScrollButtonComponent = TabScrollButton,
    scrollButtons = "auto",
    selectionFollowsFocus,
    slots = {},
    slotProps = {},
    TabIndicatorProps = {},
    TabScrollButtonProps = {},
    textColor = "primary",
    value,
    variant = "standard",
    visibleScrollbar = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$15);
  const scrollable = variant === "scrollable";
  const vertical = orientation === "vertical";
  const scrollStart = vertical ? "scrollTop" : "scrollLeft";
  const start = vertical ? "top" : "left";
  const end = vertical ? "bottom" : "right";
  const clientSize = vertical ? "clientHeight" : "clientWidth";
  const size = vertical ? "height" : "width";
  const ownerState = _extends({}, props, {
    component,
    allowScrollButtonsMobile,
    indicatorColor,
    orientation,
    vertical,
    scrollButtons,
    textColor,
    variant,
    visibleScrollbar,
    fixed: !scrollable,
    hideScrollbar: scrollable && !visibleScrollbar,
    scrollableX: scrollable && !vertical,
    scrollableY: scrollable && vertical,
    centered: centered && !scrollable,
    scrollButtonsHideMobile: !allowScrollButtonsMobile
  });
  const classes = useUtilityClasses$10(ownerState);
  const startScrollButtonIconProps = useSlotProps({
    elementType: slots.StartScrollButtonIcon,
    externalSlotProps: slotProps.startScrollButtonIcon,
    ownerState
  });
  const endScrollButtonIconProps = useSlotProps({
    elementType: slots.EndScrollButtonIcon,
    externalSlotProps: slotProps.endScrollButtonIcon,
    ownerState
  });
  const [mounted, setMounted] = reactExports.useState(false);
  const [indicatorStyle, setIndicatorStyle] = reactExports.useState(defaultIndicatorStyle);
  const [displayStartScroll, setDisplayStartScroll] = reactExports.useState(false);
  const [displayEndScroll, setDisplayEndScroll] = reactExports.useState(false);
  const [updateScrollObserver, setUpdateScrollObserver] = reactExports.useState(false);
  const [scrollerStyle, setScrollerStyle] = reactExports.useState({
    overflow: "hidden",
    scrollbarWidth: 0
  });
  const valueToIndex = /* @__PURE__ */ new Map();
  const tabsRef = reactExports.useRef(null);
  const tabListRef = reactExports.useRef(null);
  const getTabsMeta = () => {
    const tabsNode = tabsRef.current;
    let tabsMeta;
    if (tabsNode) {
      const rect = tabsNode.getBoundingClientRect();
      tabsMeta = {
        clientWidth: tabsNode.clientWidth,
        scrollLeft: tabsNode.scrollLeft,
        scrollTop: tabsNode.scrollTop,
        scrollLeftNormalized: getNormalizedScrollLeft(tabsNode, isRtl ? "rtl" : "ltr"),
        scrollWidth: tabsNode.scrollWidth,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right
      };
    }
    let tabMeta;
    if (tabsNode && value !== false) {
      const children2 = tabListRef.current.children;
      if (children2.length > 0) {
        const tab = children2[valueToIndex.get(value)];
        tabMeta = tab ? tab.getBoundingClientRect() : null;
      }
    }
    return {
      tabsMeta,
      tabMeta
    };
  };
  const updateIndicatorState = useEventCallback(() => {
    const {
      tabsMeta,
      tabMeta
    } = getTabsMeta();
    let startValue = 0;
    let startIndicator;
    if (vertical) {
      startIndicator = "top";
      if (tabMeta && tabsMeta) {
        startValue = tabMeta.top - tabsMeta.top + tabsMeta.scrollTop;
      }
    } else {
      startIndicator = isRtl ? "right" : "left";
      if (tabMeta && tabsMeta) {
        const correction = isRtl ? tabsMeta.scrollLeftNormalized + tabsMeta.clientWidth - tabsMeta.scrollWidth : tabsMeta.scrollLeft;
        startValue = (isRtl ? -1 : 1) * (tabMeta[startIndicator] - tabsMeta[startIndicator] + correction);
      }
    }
    const newIndicatorStyle = {
      [startIndicator]: startValue,
      // May be wrong until the font is loaded.
      [size]: tabMeta ? tabMeta[size] : 0
    };
    if (isNaN(indicatorStyle[startIndicator]) || isNaN(indicatorStyle[size])) {
      setIndicatorStyle(newIndicatorStyle);
    } else {
      const dStart = Math.abs(indicatorStyle[startIndicator] - newIndicatorStyle[startIndicator]);
      const dSize = Math.abs(indicatorStyle[size] - newIndicatorStyle[size]);
      if (dStart >= 1 || dSize >= 1) {
        setIndicatorStyle(newIndicatorStyle);
      }
    }
  });
  const scroll = (scrollValue, {
    animation = true
  } = {}) => {
    if (animation) {
      animate(scrollStart, tabsRef.current, scrollValue, {
        duration: theme.transitions.duration.standard
      });
    } else {
      tabsRef.current[scrollStart] = scrollValue;
    }
  };
  const moveTabsScroll = (delta) => {
    let scrollValue = tabsRef.current[scrollStart];
    if (vertical) {
      scrollValue += delta;
    } else {
      scrollValue += delta * (isRtl ? -1 : 1);
      scrollValue *= isRtl && detectScrollType() === "reverse" ? -1 : 1;
    }
    scroll(scrollValue);
  };
  const getScrollSize = () => {
    const containerSize = tabsRef.current[clientSize];
    let totalSize = 0;
    const children2 = Array.from(tabListRef.current.children);
    for (let i = 0; i < children2.length; i += 1) {
      const tab = children2[i];
      if (totalSize + tab[clientSize] > containerSize) {
        if (i === 0) {
          totalSize = containerSize;
        }
        break;
      }
      totalSize += tab[clientSize];
    }
    return totalSize;
  };
  const handleStartScrollClick = () => {
    moveTabsScroll(-1 * getScrollSize());
  };
  const handleEndScrollClick = () => {
    moveTabsScroll(getScrollSize());
  };
  const handleScrollbarSizeChange = reactExports.useCallback((scrollbarWidth) => {
    setScrollerStyle({
      overflow: null,
      scrollbarWidth
    });
  }, []);
  const getConditionalElements = () => {
    const conditionalElements2 = {};
    conditionalElements2.scrollbarSizeListener = scrollable ? /* @__PURE__ */ jsxRuntimeExports.jsx(TabsScrollbarSize, {
      onChange: handleScrollbarSizeChange,
      className: clsx(classes.scrollableX, classes.hideScrollbar)
    }) : null;
    const scrollButtonsActive = displayStartScroll || displayEndScroll;
    const showScrollButtons = scrollable && (scrollButtons === "auto" && scrollButtonsActive || scrollButtons === true);
    conditionalElements2.scrollButtonStart = showScrollButtons ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollButtonComponent, _extends({
      slots: {
        StartScrollButtonIcon: slots.StartScrollButtonIcon
      },
      slotProps: {
        startScrollButtonIcon: startScrollButtonIconProps
      },
      orientation,
      direction: isRtl ? "right" : "left",
      onClick: handleStartScrollClick,
      disabled: !displayStartScroll
    }, TabScrollButtonProps, {
      className: clsx(classes.scrollButtons, TabScrollButtonProps.className)
    })) : null;
    conditionalElements2.scrollButtonEnd = showScrollButtons ? /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollButtonComponent, _extends({
      slots: {
        EndScrollButtonIcon: slots.EndScrollButtonIcon
      },
      slotProps: {
        endScrollButtonIcon: endScrollButtonIconProps
      },
      orientation,
      direction: isRtl ? "left" : "right",
      onClick: handleEndScrollClick,
      disabled: !displayEndScroll
    }, TabScrollButtonProps, {
      className: clsx(classes.scrollButtons, TabScrollButtonProps.className)
    })) : null;
    return conditionalElements2;
  };
  const scrollSelectedIntoView = useEventCallback((animation) => {
    const {
      tabsMeta,
      tabMeta
    } = getTabsMeta();
    if (!tabMeta || !tabsMeta) {
      return;
    }
    if (tabMeta[start] < tabsMeta[start]) {
      const nextScrollStart = tabsMeta[scrollStart] + (tabMeta[start] - tabsMeta[start]);
      scroll(nextScrollStart, {
        animation
      });
    } else if (tabMeta[end] > tabsMeta[end]) {
      const nextScrollStart = tabsMeta[scrollStart] + (tabMeta[end] - tabsMeta[end]);
      scroll(nextScrollStart, {
        animation
      });
    }
  });
  const updateScrollButtonState = useEventCallback(() => {
    if (scrollable && scrollButtons !== false) {
      setUpdateScrollObserver(!updateScrollObserver);
    }
  });
  reactExports.useEffect(() => {
    const handleResize = debounce(() => {
      if (tabsRef.current) {
        updateIndicatorState();
      }
    });
    let resizeObserver;
    const handleMutation = (records) => {
      records.forEach((record) => {
        record.removedNodes.forEach((item) => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.unobserve(item);
        });
        record.addedNodes.forEach((item) => {
          var _resizeObserver2;
          (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.observe(item);
        });
      });
      handleResize();
      updateScrollButtonState();
    };
    const win = ownerWindow(tabsRef.current);
    win.addEventListener("resize", handleResize);
    let mutationObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      Array.from(tabListRef.current.children).forEach((child) => {
        resizeObserver.observe(child);
      });
    }
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(handleMutation);
      mutationObserver.observe(tabListRef.current, {
        childList: true
      });
    }
    return () => {
      var _mutationObserver, _resizeObserver3;
      handleResize.clear();
      win.removeEventListener("resize", handleResize);
      (_mutationObserver = mutationObserver) == null || _mutationObserver.disconnect();
      (_resizeObserver3 = resizeObserver) == null || _resizeObserver3.disconnect();
    };
  }, [updateIndicatorState, updateScrollButtonState]);
  reactExports.useEffect(() => {
    const tabListChildren = Array.from(tabListRef.current.children);
    const length = tabListChildren.length;
    if (typeof IntersectionObserver !== "undefined" && length > 0 && scrollable && scrollButtons !== false) {
      const firstTab = tabListChildren[0];
      const lastTab = tabListChildren[length - 1];
      const observerOptions = {
        root: tabsRef.current,
        threshold: 0.99
      };
      const handleScrollButtonStart = (entries) => {
        setDisplayStartScroll(!entries[0].isIntersecting);
      };
      const firstObserver = new IntersectionObserver(handleScrollButtonStart, observerOptions);
      firstObserver.observe(firstTab);
      const handleScrollButtonEnd = (entries) => {
        setDisplayEndScroll(!entries[0].isIntersecting);
      };
      const lastObserver = new IntersectionObserver(handleScrollButtonEnd, observerOptions);
      lastObserver.observe(lastTab);
      return () => {
        firstObserver.disconnect();
        lastObserver.disconnect();
      };
    }
    return void 0;
  }, [scrollable, scrollButtons, updateScrollObserver, childrenProp == null ? void 0 : childrenProp.length]);
  reactExports.useEffect(() => {
    setMounted(true);
  }, []);
  reactExports.useEffect(() => {
    updateIndicatorState();
  });
  reactExports.useEffect(() => {
    scrollSelectedIntoView(defaultIndicatorStyle !== indicatorStyle);
  }, [scrollSelectedIntoView, indicatorStyle]);
  reactExports.useImperativeHandle(action, () => ({
    updateIndicator: updateIndicatorState,
    updateScrollButtons: updateScrollButtonState
  }), [updateIndicatorState, updateScrollButtonState]);
  const indicator = /* @__PURE__ */ jsxRuntimeExports.jsx(TabsIndicator, _extends({}, TabIndicatorProps, {
    className: clsx(classes.indicator, TabIndicatorProps.className),
    ownerState,
    style: _extends({}, indicatorStyle, TabIndicatorProps.style)
  }));
  let childIndex = 0;
  const children = reactExports.Children.map(childrenProp, (child) => {
    if (!/* @__PURE__ */ reactExports.isValidElement(child)) {
      return null;
    }
    const childValue = child.props.value === void 0 ? childIndex : child.props.value;
    valueToIndex.set(childValue, childIndex);
    const selected = childValue === value;
    childIndex += 1;
    return /* @__PURE__ */ reactExports.cloneElement(child, _extends({
      fullWidth: variant === "fullWidth",
      indicator: selected && !mounted && indicator,
      selected,
      selectionFollowsFocus,
      onChange,
      textColor,
      value: childValue
    }, childIndex === 1 && value === false && !child.props.tabIndex ? {
      tabIndex: 0
    } : {}));
  });
  const handleKeyDown2 = (event) => {
    const list = tabListRef.current;
    const currentFocus = ownerDocument(list).activeElement;
    const role = currentFocus.getAttribute("role");
    if (role !== "tab") {
      return;
    }
    let previousItemKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    let nextItemKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (orientation === "horizontal" && isRtl) {
      previousItemKey = "ArrowRight";
      nextItemKey = "ArrowLeft";
    }
    switch (event.key) {
      case previousItemKey:
        event.preventDefault();
        moveFocus(list, currentFocus, previousItem);
        break;
      case nextItemKey:
        event.preventDefault();
        moveFocus(list, currentFocus, nextItem);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(list, null, nextItem);
        break;
      case "End":
        event.preventDefault();
        moveFocus(list, null, previousItem);
        break;
    }
  };
  const conditionalElements = getConditionalElements();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref,
    as: component
  }, other, {
    children: [conditionalElements.scrollButtonStart, conditionalElements.scrollbarSizeListener, /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsScroller, {
      className: classes.scroller,
      ownerState,
      style: {
        overflow: scrollerStyle.overflow,
        [vertical ? `margin${isRtl ? "Left" : "Right"}` : "marginBottom"]: visibleScrollbar ? void 0 : -scrollerStyle.scrollbarWidth
      },
      ref: tabsRef,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FlexContainer, {
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
        "aria-orientation": orientation === "vertical" ? "vertical" : null,
        className: classes.flexContainer,
        ownerState,
        onKeyDown: handleKeyDown2,
        ref: tabListRef,
        role: "tablist",
        children
      }), mounted && indicator]
    }), conditionalElements.scrollButtonEnd]
  }));
});
dayjs.extend(customParseFormatPlugin);
dayjs.extend(localizedFormatPlugin);
dayjs.extend(isBetweenPlugin);
const localeNotFoundWarning = buildWarning(["Your locale has not been found.", "Either the locale key is not a supported one. Locales supported by dayjs are available here: https://github.com/iamkun/dayjs/tree/dev/src/locale", "Or you forget to import the locale from 'dayjs/locale/{localeUsed}'", "fallback on English locale"]);
const formatTokenMap = {
  // Year
  YY: "year",
  YYYY: {
    sectionType: "year",
    contentType: "digit",
    maxLength: 4
  },
  // Month
  M: {
    sectionType: "month",
    contentType: "digit",
    maxLength: 2
  },
  MM: "month",
  MMM: {
    sectionType: "month",
    contentType: "letter"
  },
  MMMM: {
    sectionType: "month",
    contentType: "letter"
  },
  // Day of the month
  D: {
    sectionType: "day",
    contentType: "digit",
    maxLength: 2
  },
  DD: "day",
  Do: {
    sectionType: "day",
    contentType: "digit-with-letter"
  },
  // Day of the week
  d: {
    sectionType: "weekDay",
    contentType: "digit",
    maxLength: 2
  },
  dd: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  ddd: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  dddd: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  // Meridiem
  A: "meridiem",
  a: "meridiem",
  // Hours
  H: {
    sectionType: "hours",
    contentType: "digit",
    maxLength: 2
  },
  HH: "hours",
  h: {
    sectionType: "hours",
    contentType: "digit",
    maxLength: 2
  },
  hh: "hours",
  // Minutes
  m: {
    sectionType: "minutes",
    contentType: "digit",
    maxLength: 2
  },
  mm: "minutes",
  // Seconds
  s: {
    sectionType: "seconds",
    contentType: "digit",
    maxLength: 2
  },
  ss: "seconds"
};
const defaultFormats = {
  year: "YYYY",
  month: "MMMM",
  monthShort: "MMM",
  dayOfMonth: "D",
  weekday: "dddd",
  weekdayShort: "dd",
  hours24h: "HH",
  hours12h: "hh",
  meridiem: "A",
  minutes: "mm",
  seconds: "ss",
  fullDate: "ll",
  fullDateWithWeekday: "dddd, LL",
  keyboardDate: "L",
  shortDate: "MMM D",
  normalDate: "D MMMM",
  normalDateWithWeekday: "ddd, MMM D",
  monthAndYear: "MMMM YYYY",
  monthAndDate: "MMMM D",
  fullTime: "LT",
  fullTime12h: "hh:mm A",
  fullTime24h: "HH:mm",
  fullDateTime: "lll",
  fullDateTime12h: "ll hh:mm A",
  fullDateTime24h: "ll HH:mm",
  keyboardDateTime: "L LT",
  keyboardDateTime12h: "L hh:mm A",
  keyboardDateTime24h: "L HH:mm"
};
const MISSING_UTC_PLUGIN = ["Missing UTC plugin", "To be able to use UTC or timezones, you have to enable the `utc` plugin", "Find more information on https://mui.com/x/react-date-pickers/timezone/#day-js-and-utc"].join("\n");
const MISSING_TIMEZONE_PLUGIN = ["Missing timezone plugin", "To be able to use timezones, you have to enable both the `utc` and the `timezone` plugin", "Find more information on https://mui.com/x/react-date-pickers/timezone/#day-js-and-timezone"].join("\n");
const withLocale = (dayjs2, locale) => !locale ? dayjs2 : (...args) => dayjs2(...args).locale(locale);
class AdapterDayjs {
  constructor({
    locale: _locale,
    formats,
    instance
  } = {}) {
    var _this$rawDayJsInstanc;
    this.isMUIAdapter = true;
    this.isTimezoneCompatible = true;
    this.lib = "dayjs";
    this.rawDayJsInstance = void 0;
    this.dayjs = void 0;
    this.locale = void 0;
    this.formats = void 0;
    this.escapedCharacters = {
      start: "[",
      end: "]"
    };
    this.formatTokenMap = formatTokenMap;
    this.setLocaleToValue = (value) => {
      const expectedLocale = this.getCurrentLocaleCode();
      if (expectedLocale === value.locale()) {
        return value;
      }
      return value.locale(expectedLocale);
    };
    this.hasUTCPlugin = () => typeof dayjs.utc !== "undefined";
    this.hasTimezonePlugin = () => typeof dayjs.tz !== "undefined";
    this.isSame = (value, comparing, comparisonTemplate) => {
      const comparingInValueTimezone = this.setTimezone(comparing, this.getTimezone(value));
      return value.format(comparisonTemplate) === comparingInValueTimezone.format(comparisonTemplate);
    };
    this.cleanTimezone = (timezone) => {
      switch (timezone) {
        case "default": {
          return void 0;
        }
        case "system": {
          return dayjs.tz.guess();
        }
        default: {
          return timezone;
        }
      }
    };
    this.createSystemDate = (value) => {
      if (this.rawDayJsInstance) {
        return this.rawDayJsInstance(value);
      }
      if (this.hasUTCPlugin() && this.hasTimezonePlugin()) {
        const timezone = dayjs.tz.guess();
        if (timezone !== "UTC") {
          return dayjs.tz(value, timezone);
        }
        return dayjs(value);
      }
      return dayjs(value);
    };
    this.createUTCDate = (value) => {
      if (!this.hasUTCPlugin()) {
        throw new Error(MISSING_UTC_PLUGIN);
      }
      return dayjs.utc(value);
    };
    this.createTZDate = (value, timezone) => {
      if (!this.hasUTCPlugin()) {
        throw new Error(MISSING_UTC_PLUGIN);
      }
      if (!this.hasTimezonePlugin()) {
        throw new Error(MISSING_TIMEZONE_PLUGIN);
      }
      const keepLocalTime = value !== void 0 && !value.endsWith("Z");
      return dayjs(value).tz(this.cleanTimezone(timezone), keepLocalTime);
    };
    this.getLocaleFormats = () => {
      const locales = dayjs.Ls;
      const locale = this.locale || "en";
      let localeObject = locales[locale];
      if (localeObject === void 0) {
        localeNotFoundWarning();
        localeObject = locales.en;
      }
      return localeObject.formats;
    };
    this.adjustOffset = (value) => {
      if (!this.hasTimezonePlugin()) {
        return value;
      }
      const timezone = this.getTimezone(value);
      if (timezone !== "UTC") {
        var _fixedValue$$offset, _value$$offset;
        const fixedValue = value.tz(this.cleanTimezone(timezone), true);
        if (((_fixedValue$$offset = fixedValue.$offset) != null ? _fixedValue$$offset : 0) === ((_value$$offset = value.$offset) != null ? _value$$offset : 0)) {
          return value;
        }
        return fixedValue;
      }
      return value;
    };
    this.date = (value) => {
      if (value === null) {
        return null;
      }
      return this.dayjs(value);
    };
    this.dateWithTimezone = (value, timezone) => {
      if (value === null) {
        return null;
      }
      let parsedValue;
      if (timezone === "UTC") {
        parsedValue = this.createUTCDate(value);
      } else if (timezone === "system" || timezone === "default" && !this.hasTimezonePlugin()) {
        parsedValue = this.createSystemDate(value);
      } else {
        parsedValue = this.createTZDate(value, timezone);
      }
      if (this.locale === void 0) {
        return parsedValue;
      }
      return parsedValue.locale(this.locale);
    };
    this.getTimezone = (value) => {
      if (this.hasTimezonePlugin()) {
        var _value$$x;
        const zone = (_value$$x = value.$x) == null ? void 0 : _value$$x.$timezone;
        if (zone) {
          return zone;
        }
      }
      if (this.hasUTCPlugin() && value.isUTC()) {
        return "UTC";
      }
      return "system";
    };
    this.setTimezone = (value, timezone) => {
      if (this.getTimezone(value) === timezone) {
        return value;
      }
      if (timezone === "UTC") {
        if (!this.hasUTCPlugin()) {
          throw new Error(MISSING_UTC_PLUGIN);
        }
        return value.utc();
      }
      if (timezone === "system") {
        return value.local();
      }
      if (!this.hasTimezonePlugin()) {
        if (timezone === "default") {
          return value;
        }
        throw new Error(MISSING_TIMEZONE_PLUGIN);
      }
      return dayjs.tz(value, this.cleanTimezone(timezone));
    };
    this.toJsDate = (value) => {
      return value.toDate();
    };
    this.parseISO = (isoString) => {
      return this.dayjs(isoString);
    };
    this.toISO = (value) => {
      return value.toISOString();
    };
    this.parse = (value, format) => {
      if (value === "") {
        return null;
      }
      return this.dayjs(value, format, this.locale, true);
    };
    this.getCurrentLocaleCode = () => {
      return this.locale || "en";
    };
    this.is12HourCycleInCurrentLocale = () => {
      return /A|a/.test(this.getLocaleFormats().LT || "");
    };
    this.expandFormat = (format) => {
      const localeFormats = this.getLocaleFormats();
      const t2 = (formatBis) => formatBis.replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, (_2, a, b2) => a || b2.slice(1));
      return format.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, (_2, a, b2) => {
        const B = b2 && b2.toUpperCase();
        return a || localeFormats[b2] || t2(localeFormats[B]);
      });
    };
    this.getFormatHelperText = (format) => {
      return this.expandFormat(format).replace(/a/gi, "(a|p)m").toLocaleLowerCase();
    };
    this.isNull = (value) => {
      return value === null;
    };
    this.isValid = (value) => {
      return this.dayjs(value).isValid();
    };
    this.format = (value, formatKey) => {
      return this.formatByString(value, this.formats[formatKey]);
    };
    this.formatByString = (value, formatString) => {
      return this.dayjs(value).format(formatString);
    };
    this.formatNumber = (numberToFormat) => {
      return numberToFormat;
    };
    this.getDiff = (value, comparing, unit) => {
      return value.diff(comparing, unit);
    };
    this.isEqual = (value, comparing) => {
      if (value === null && comparing === null) {
        return true;
      }
      return this.dayjs(value).toDate().getTime() === this.dayjs(comparing).toDate().getTime();
    };
    this.isSameYear = (value, comparing) => {
      return this.isSame(value, comparing, "YYYY");
    };
    this.isSameMonth = (value, comparing) => {
      return this.isSame(value, comparing, "YYYY-MM");
    };
    this.isSameDay = (value, comparing) => {
      return this.isSame(value, comparing, "YYYY-MM-DD");
    };
    this.isSameHour = (value, comparing) => {
      return value.isSame(comparing, "hour");
    };
    this.isAfter = (value, comparing) => {
      return value > comparing;
    };
    this.isAfterYear = (value, comparing) => {
      if (!this.hasUTCPlugin()) {
        return value.isAfter(comparing, "year");
      }
      return !this.isSameYear(value, comparing) && value.utc() > comparing.utc();
    };
    this.isAfterDay = (value, comparing) => {
      if (!this.hasUTCPlugin()) {
        return value.isAfter(comparing, "day");
      }
      return !this.isSameDay(value, comparing) && value.utc() > comparing.utc();
    };
    this.isBefore = (value, comparing) => {
      return value < comparing;
    };
    this.isBeforeYear = (value, comparing) => {
      if (!this.hasUTCPlugin()) {
        return value.isBefore(comparing, "year");
      }
      return !this.isSameYear(value, comparing) && value.utc() < comparing.utc();
    };
    this.isBeforeDay = (value, comparing) => {
      if (!this.hasUTCPlugin()) {
        return value.isBefore(comparing, "day");
      }
      return !this.isSameDay(value, comparing) && value.utc() < comparing.utc();
    };
    this.isWithinRange = (value, [start, end]) => {
      return value >= start && value <= end;
    };
    this.startOfYear = (value) => {
      return this.adjustOffset(value.startOf("year"));
    };
    this.startOfMonth = (value) => {
      return this.adjustOffset(value.startOf("month"));
    };
    this.startOfWeek = (value) => {
      return this.adjustOffset(value.startOf("week"));
    };
    this.startOfDay = (value) => {
      return this.adjustOffset(value.startOf("day"));
    };
    this.endOfYear = (value) => {
      return this.adjustOffset(value.endOf("year"));
    };
    this.endOfMonth = (value) => {
      return this.adjustOffset(value.endOf("month"));
    };
    this.endOfWeek = (value) => {
      return this.adjustOffset(value.endOf("week"));
    };
    this.endOfDay = (value) => {
      return this.adjustOffset(value.endOf("day"));
    };
    this.addYears = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "year") : value.add(amount, "year"));
    };
    this.addMonths = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "month") : value.add(amount, "month"));
    };
    this.addWeeks = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "week") : value.add(amount, "week"));
    };
    this.addDays = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "day") : value.add(amount, "day"));
    };
    this.addHours = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "hour") : value.add(amount, "hour"));
    };
    this.addMinutes = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "minute") : value.add(amount, "minute"));
    };
    this.addSeconds = (value, amount) => {
      return this.adjustOffset(amount < 0 ? value.subtract(Math.abs(amount), "second") : value.add(amount, "second"));
    };
    this.getYear = (value) => {
      return value.year();
    };
    this.getMonth = (value) => {
      return value.month();
    };
    this.getDate = (value) => {
      return value.date();
    };
    this.getHours = (value) => {
      return value.hour();
    };
    this.getMinutes = (value) => {
      return value.minute();
    };
    this.getSeconds = (value) => {
      return value.second();
    };
    this.getMilliseconds = (value) => {
      return value.millisecond();
    };
    this.setYear = (value, year) => {
      return this.adjustOffset(value.set("year", year));
    };
    this.setMonth = (value, month) => {
      return this.adjustOffset(value.set("month", month));
    };
    this.setDate = (value, date) => {
      return this.adjustOffset(value.set("date", date));
    };
    this.setHours = (value, hours) => {
      return this.adjustOffset(value.set("hour", hours));
    };
    this.setMinutes = (value, minutes) => {
      return this.adjustOffset(value.set("minute", minutes));
    };
    this.setSeconds = (value, seconds) => {
      return this.adjustOffset(value.set("second", seconds));
    };
    this.setMilliseconds = (value, milliseconds) => {
      return this.adjustOffset(value.set("millisecond", milliseconds));
    };
    this.getDaysInMonth = (value) => {
      return value.daysInMonth();
    };
    this.getNextMonth = (value) => {
      return this.addMonths(value, 1);
    };
    this.getPreviousMonth = (value) => {
      return this.addMonths(value, -1);
    };
    this.getMonthArray = (value) => {
      const firstMonth = value.startOf("year");
      const monthArray = [firstMonth];
      while (monthArray.length < 12) {
        const prevMonth = monthArray[monthArray.length - 1];
        monthArray.push(this.addMonths(prevMonth, 1));
      }
      return monthArray;
    };
    this.mergeDateAndTime = (dateParam, timeParam) => {
      return dateParam.hour(timeParam.hour()).minute(timeParam.minute()).second(timeParam.second());
    };
    this.getWeekdays = () => {
      const start = this.dayjs().startOf("week");
      return [0, 1, 2, 3, 4, 5, 6].map((diff) => this.formatByString(this.addDays(start, diff), "dd"));
    };
    this.getWeekArray = (value) => {
      const cleanValue = this.setLocaleToValue(value);
      const start = cleanValue.startOf("month").startOf("week");
      const end = cleanValue.endOf("month").endOf("week");
      let count = 0;
      let current = start;
      const nestedWeeks = [];
      while (current < end) {
        const weekNumber = Math.floor(count / 7);
        nestedWeeks[weekNumber] = nestedWeeks[weekNumber] || [];
        nestedWeeks[weekNumber].push(current);
        current = this.addDays(current, 1);
        count += 1;
      }
      return nestedWeeks;
    };
    this.getWeekNumber = (value) => {
      return value.week();
    };
    this.getYearRange = (start, end) => {
      const startDate = start.startOf("year");
      const endDate = end.endOf("year");
      const years = [];
      let current = startDate;
      while (current < endDate) {
        years.push(current);
        current = this.addYears(current, 1);
      }
      return years;
    };
    this.getMeridiemText = (ampm) => {
      return ampm === "am" ? "AM" : "PM";
    };
    this.rawDayJsInstance = instance;
    this.dayjs = withLocale((_this$rawDayJsInstanc = this.rawDayJsInstance) != null ? _this$rawDayJsInstanc : dayjs, _locale);
    this.locale = _locale;
    this.formats = _extends({}, defaultFormats, formats);
    dayjs.extend(weekOfYear);
  }
}
const html = (theme, enableColorScheme) => _extends({
  WebkitFontSmoothing: "antialiased",
  // Antialiasing.
  MozOsxFontSmoothing: "grayscale",
  // Antialiasing.
  // Change from `box-sizing: content-box` so that `width`
  // is not affected by `padding` or `border`.
  boxSizing: "border-box",
  // Fix font resize problem in iOS
  WebkitTextSizeAdjust: "100%"
}, enableColorScheme && !theme.vars && {
  colorScheme: theme.palette.mode
});
const body = (theme) => _extends({
  color: (theme.vars || theme).palette.text.primary
}, theme.typography.body1, {
  backgroundColor: (theme.vars || theme).palette.background.default,
  "@media print": {
    // Save printer ink.
    backgroundColor: (theme.vars || theme).palette.common.white
  }
});
const styles$1 = (theme, enableColorScheme = false) => {
  var _theme$components;
  const colorSchemeStyles = {};
  if (enableColorScheme && theme.colorSchemes) {
    Object.entries(theme.colorSchemes).forEach(([key, scheme]) => {
      var _scheme$palette;
      colorSchemeStyles[theme.getColorSchemeSelector(key).replace(/\s*&/, "")] = {
        colorScheme: (_scheme$palette = scheme.palette) == null ? void 0 : _scheme$palette.mode
      };
    });
  }
  let defaultStyles = _extends({
    html: html(theme, enableColorScheme),
    "*, *::before, *::after": {
      boxSizing: "inherit"
    },
    "strong, b": {
      fontWeight: theme.typography.fontWeightBold
    },
    body: _extends({
      margin: 0
    }, body(theme), {
      // Add support for document.body.requestFullScreen().
      // Other elements, if background transparent, are not supported.
      "&::backdrop": {
        backgroundColor: (theme.vars || theme).palette.background.default
      }
    })
  }, colorSchemeStyles);
  const themeOverrides = (_theme$components = theme.components) == null || (_theme$components = _theme$components.MuiCssBaseline) == null ? void 0 : _theme$components.styleOverrides;
  if (themeOverrides) {
    defaultStyles = [defaultStyles, themeOverrides];
  }
  return defaultStyles;
};
function CssBaseline(inProps) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCssBaseline"
  });
  const {
    children,
    enableColorScheme = false
  } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(GlobalStyles, {
      styles: (theme) => styles$1(theme, enableColorScheme)
    }), children]
  });
}
function createUseThemeProps(name) {
  return useThemeProps$a;
}
function getCollapseUtilityClass(slot) {
  return generateUtilityClass$2("MuiCollapse", slot);
}
generateUtilityClasses("MuiCollapse", ["root", "horizontal", "vertical", "entered", "hidden", "wrapper", "wrapperInner"]);
const _excluded$14 = ["addEndListener", "children", "className", "collapsedSize", "component", "easing", "in", "onEnter", "onEntered", "onEntering", "onExit", "onExited", "onExiting", "orientation", "style", "timeout", "TransitionComponent"];
const useUtilityClasses$$ = (ownerState) => {
  const {
    orientation,
    classes
  } = ownerState;
  const slots = {
    root: ["root", `${orientation}`],
    entered: ["entered"],
    hidden: ["hidden"],
    wrapper: ["wrapper", `${orientation}`],
    wrapperInner: ["wrapperInner", `${orientation}`]
  };
  return composeClasses(slots, getCollapseUtilityClass, classes);
};
const CollapseRoot = styled("div", {
  name: "MuiCollapse",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.orientation], ownerState.state === "entered" && styles2.entered, ownerState.state === "exited" && !ownerState.in && ownerState.collapsedSize === "0px" && styles2.hidden];
  }
})(({
  theme,
  ownerState
}) => _extends({
  height: 0,
  overflow: "hidden",
  transition: theme.transitions.create("height")
}, ownerState.orientation === "horizontal" && {
  height: "auto",
  width: 0,
  transition: theme.transitions.create("width")
}, ownerState.state === "entered" && _extends({
  height: "auto",
  overflow: "visible"
}, ownerState.orientation === "horizontal" && {
  width: "auto"
}), ownerState.state === "exited" && !ownerState.in && ownerState.collapsedSize === "0px" && {
  visibility: "hidden"
}));
const CollapseWrapper = styled("div", {
  name: "MuiCollapse",
  slot: "Wrapper",
  overridesResolver: (props, styles2) => styles2.wrapper
})(({
  ownerState
}) => _extends({
  // Hack to get children with a negative margin to not falsify the height computation.
  display: "flex",
  width: "100%"
}, ownerState.orientation === "horizontal" && {
  width: "auto",
  height: "100%"
}));
const CollapseWrapperInner = styled("div", {
  name: "MuiCollapse",
  slot: "WrapperInner",
  overridesResolver: (props, styles2) => styles2.wrapperInner
})(({
  ownerState
}) => _extends({
  width: "100%"
}, ownerState.orientation === "horizontal" && {
  width: "auto",
  height: "100%"
}));
const Collapse = /* @__PURE__ */ reactExports.forwardRef(function Collapse2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCollapse"
  });
  const {
    addEndListener,
    children,
    className,
    collapsedSize: collapsedSizeProp = "0px",
    component,
    easing: easing2,
    in: inProp,
    onEnter,
    onEntered,
    onEntering,
    onExit,
    onExited,
    onExiting,
    orientation = "vertical",
    style: style2,
    timeout = duration.standard,
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Transition
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$14);
  const ownerState = _extends({}, props, {
    orientation,
    collapsedSize: collapsedSizeProp
  });
  const classes = useUtilityClasses$$(ownerState);
  const theme = useTheme$1();
  const timer = useTimeout();
  const wrapperRef = reactExports.useRef(null);
  const autoTransitionDuration = reactExports.useRef();
  const collapsedSize = typeof collapsedSizeProp === "number" ? `${collapsedSizeProp}px` : collapsedSizeProp;
  const isHorizontal2 = orientation === "horizontal";
  const size = isHorizontal2 ? "width" : "height";
  const nodeRef = reactExports.useRef(null);
  const handleRef = useForkRef(ref, nodeRef);
  const normalizedTransitionCallback = (callback) => (maybeIsAppearing) => {
    if (callback) {
      const node = nodeRef.current;
      if (maybeIsAppearing === void 0) {
        callback(node);
      } else {
        callback(node, maybeIsAppearing);
      }
    }
  };
  const getWrapperSize = () => wrapperRef.current ? wrapperRef.current[isHorizontal2 ? "clientWidth" : "clientHeight"] : 0;
  const handleEnter = normalizedTransitionCallback((node, isAppearing) => {
    if (wrapperRef.current && isHorizontal2) {
      wrapperRef.current.style.position = "absolute";
    }
    node.style[size] = collapsedSize;
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  });
  const handleEntering = normalizedTransitionCallback((node, isAppearing) => {
    const wrapperSize = getWrapperSize();
    if (wrapperRef.current && isHorizontal2) {
      wrapperRef.current.style.position = "";
    }
    const {
      duration: transitionDuration,
      easing: transitionTimingFunction
    } = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "enter"
    });
    if (timeout === "auto") {
      const duration2 = theme.transitions.getAutoHeightDuration(wrapperSize);
      node.style.transitionDuration = `${duration2}ms`;
      autoTransitionDuration.current = duration2;
    } else {
      node.style.transitionDuration = typeof transitionDuration === "string" ? transitionDuration : `${transitionDuration}ms`;
    }
    node.style[size] = `${wrapperSize}px`;
    node.style.transitionTimingFunction = transitionTimingFunction;
    if (onEntering) {
      onEntering(node, isAppearing);
    }
  });
  const handleEntered = normalizedTransitionCallback((node, isAppearing) => {
    node.style[size] = "auto";
    if (onEntered) {
      onEntered(node, isAppearing);
    }
  });
  const handleExit = normalizedTransitionCallback((node) => {
    node.style[size] = `${getWrapperSize()}px`;
    if (onExit) {
      onExit(node);
    }
  });
  const handleExited = normalizedTransitionCallback(onExited);
  const handleExiting = normalizedTransitionCallback((node) => {
    const wrapperSize = getWrapperSize();
    const {
      duration: transitionDuration,
      easing: transitionTimingFunction
    } = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "exit"
    });
    if (timeout === "auto") {
      const duration2 = theme.transitions.getAutoHeightDuration(wrapperSize);
      node.style.transitionDuration = `${duration2}ms`;
      autoTransitionDuration.current = duration2;
    } else {
      node.style.transitionDuration = typeof transitionDuration === "string" ? transitionDuration : `${transitionDuration}ms`;
    }
    node.style[size] = collapsedSize;
    node.style.transitionTimingFunction = transitionTimingFunction;
    if (onExiting) {
      onExiting(node);
    }
  });
  const handleAddEndListener = (next2) => {
    if (timeout === "auto") {
      timer.start(autoTransitionDuration.current || 0, next2);
    }
    if (addEndListener) {
      addEndListener(nodeRef.current, next2);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    in: inProp,
    onEnter: handleEnter,
    onEntered: handleEntered,
    onEntering: handleEntering,
    onExit: handleExit,
    onExited: handleExited,
    onExiting: handleExiting,
    addEndListener: handleAddEndListener,
    nodeRef,
    timeout: timeout === "auto" ? null : timeout
  }, other, {
    children: (state, childProps) => /* @__PURE__ */ jsxRuntimeExports.jsx(CollapseRoot, _extends({
      as: component,
      className: clsx(classes.root, className, {
        "entered": classes.entered,
        "exited": !inProp && collapsedSize === "0px" && classes.hidden
      }[state]),
      style: _extends({
        [isHorizontal2 ? "minWidth" : "minHeight"]: collapsedSize
      }, style2),
      ref: handleRef
    }, childProps, {
      // `ownerState` is set after `childProps` to override any existing `ownerState` property in `childProps`
      // that might have been forwarded from the Transition component.
      ownerState: _extends({}, ownerState, {
        state
      }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CollapseWrapper, {
        ownerState: _extends({}, ownerState, {
          state
        }),
        className: classes.wrapper,
        ref: wrapperRef,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CollapseWrapperInner, {
          ownerState: _extends({}, ownerState, {
            state
          }),
          className: classes.wrapperInner,
          children
        })
      })
    }))
  }));
});
Collapse.muiSupportAuto = true;
const AccordionContext = /* @__PURE__ */ reactExports.createContext({});
const _excluded$13 = ["className", "elementType", "ownerState", "externalForwardedProps", "getSlotOwnerState", "internalForwardedProps"], _excluded2$6 = ["component", "slots", "slotProps"], _excluded3 = ["component"];
function useSlot(name, parameters) {
  const {
    className,
    elementType: initialElementType,
    ownerState,
    externalForwardedProps,
    getSlotOwnerState,
    internalForwardedProps
  } = parameters, useSlotPropsParams = _objectWithoutPropertiesLoose(parameters, _excluded$13);
  const {
    component: rootComponent,
    slots = {
      [name]: void 0
    },
    slotProps = {
      [name]: void 0
    }
  } = externalForwardedProps, other = _objectWithoutPropertiesLoose(externalForwardedProps, _excluded2$6);
  const elementType = slots[name] || initialElementType;
  const resolvedComponentsProps = resolveComponentProps(slotProps[name], ownerState);
  const _mergeSlotProps = mergeSlotProps(_extends({
    className
  }, useSlotPropsParams, {
    externalForwardedProps: name === "root" ? other : void 0,
    externalSlotProps: resolvedComponentsProps
  })), {
    props: {
      component: slotComponent
    },
    internalRef
  } = _mergeSlotProps, mergedProps = _objectWithoutPropertiesLoose(_mergeSlotProps.props, _excluded3);
  const ref = useForkRef(internalRef, resolvedComponentsProps == null ? void 0 : resolvedComponentsProps.ref, parameters.ref);
  const slotOwnerState = getSlotOwnerState ? getSlotOwnerState(mergedProps) : {};
  const finalOwnerState = _extends({}, ownerState, slotOwnerState);
  const LeafComponent = name === "root" ? slotComponent || rootComponent : slotComponent;
  const props = appendOwnerState(elementType, _extends({}, name === "root" && !rootComponent && !slots[name] && internalForwardedProps, name !== "root" && !slots[name] && internalForwardedProps, mergedProps, LeafComponent && {
    as: LeafComponent
  }, {
    ref
  }), finalOwnerState);
  Object.keys(slotOwnerState).forEach((propName) => {
    delete props[propName];
  });
  return [elementType, props];
}
function getAccordionUtilityClass(slot) {
  return generateUtilityClass$2("MuiAccordion", slot);
}
const accordionClasses = generateUtilityClasses("MuiAccordion", ["root", "rounded", "expanded", "disabled", "gutters", "region"]);
const _excluded$12 = ["children", "className", "defaultExpanded", "disabled", "disableGutters", "expanded", "onChange", "square", "slots", "slotProps", "TransitionComponent", "TransitionProps"];
const useThemeProps$9 = createUseThemeProps();
const useUtilityClasses$_ = (ownerState) => {
  const {
    classes,
    square,
    expanded,
    disabled,
    disableGutters
  } = ownerState;
  const slots = {
    root: ["root", !square && "rounded", expanded && "expanded", disabled && "disabled", !disableGutters && "gutters"],
    region: ["region"]
  };
  return composeClasses(slots, getAccordionUtilityClass, classes);
};
const AccordionRoot = styled(Paper, {
  name: "MuiAccordion",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${accordionClasses.region}`]: styles2.region
    }, styles2.root, !ownerState.square && styles2.rounded, !ownerState.disableGutters && styles2.gutters];
  }
})(({
  theme
}) => {
  const transition = {
    duration: theme.transitions.duration.shortest
  };
  return {
    position: "relative",
    transition: theme.transitions.create(["margin"], transition),
    overflowAnchor: "none",
    // Keep the same scrolling position
    "&::before": {
      position: "absolute",
      left: 0,
      top: -1,
      right: 0,
      height: 1,
      content: '""',
      opacity: 1,
      backgroundColor: (theme.vars || theme).palette.divider,
      transition: theme.transitions.create(["opacity", "background-color"], transition)
    },
    "&:first-of-type": {
      "&::before": {
        display: "none"
      }
    },
    [`&.${accordionClasses.expanded}`]: {
      "&::before": {
        opacity: 0
      },
      "&:first-of-type": {
        marginTop: 0
      },
      "&:last-of-type": {
        marginBottom: 0
      },
      "& + &": {
        "&::before": {
          display: "none"
        }
      }
    },
    [`&.${accordionClasses.disabled}`]: {
      backgroundColor: (theme.vars || theme).palette.action.disabledBackground
    }
  };
}, ({
  theme
}) => ({
  variants: [{
    props: (props) => !props.square,
    style: {
      borderRadius: 0,
      "&:first-of-type": {
        borderTopLeftRadius: (theme.vars || theme).shape.borderRadius,
        borderTopRightRadius: (theme.vars || theme).shape.borderRadius
      },
      "&:last-of-type": {
        borderBottomLeftRadius: (theme.vars || theme).shape.borderRadius,
        borderBottomRightRadius: (theme.vars || theme).shape.borderRadius,
        // Fix a rendering issue on Edge
        "@supports (-ms-ime-align: auto)": {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0
        }
      }
    }
  }, {
    props: (props) => !props.disableGutters,
    style: {
      [`&.${accordionClasses.expanded}`]: {
        margin: "16px 0"
      }
    }
  }]
}));
const Accordion = /* @__PURE__ */ reactExports.forwardRef(function Accordion2(inProps, ref) {
  const props = useThemeProps$9({
    props: inProps,
    name: "MuiAccordion"
  });
  const {
    children: childrenProp,
    className,
    defaultExpanded = false,
    disabled = false,
    disableGutters = false,
    expanded: expandedProp,
    onChange,
    square = false,
    slots = {},
    slotProps = {},
    TransitionComponent: TransitionComponentProp,
    TransitionProps: TransitionPropsProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$12);
  const [expanded, setExpandedState] = useControlled({
    controlled: expandedProp,
    default: defaultExpanded,
    name: "Accordion",
    state: "expanded"
  });
  const handleChange = reactExports.useCallback((event) => {
    setExpandedState(!expanded);
    if (onChange) {
      onChange(event, !expanded);
    }
  }, [expanded, onChange, setExpandedState]);
  const [summary, ...children] = reactExports.Children.toArray(childrenProp);
  const contextValue = reactExports.useMemo(() => ({
    expanded,
    disabled,
    disableGutters,
    toggle: handleChange
  }), [expanded, disabled, disableGutters, handleChange]);
  const ownerState = _extends({}, props, {
    square,
    disabled,
    disableGutters,
    expanded
  });
  const classes = useUtilityClasses$_(ownerState);
  const backwardCompatibleSlots = _extends({
    transition: TransitionComponentProp
  }, slots);
  const backwardCompatibleSlotProps = _extends({
    transition: TransitionPropsProp
  }, slotProps);
  const [TransitionSlot, transitionProps] = useSlot("transition", {
    elementType: Collapse,
    externalForwardedProps: {
      slots: backwardCompatibleSlots,
      slotProps: backwardCompatibleSlotProps
    },
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionRoot, _extends({
    className: clsx(classes.root, className),
    ref,
    ownerState,
    square
  }, other, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AccordionContext.Provider, {
      value: contextValue,
      children: summary
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionSlot, _extends({
      in: expanded,
      timeout: "auto"
    }, transitionProps, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        "aria-labelledby": summary.props.id,
        id: summary.props["aria-controls"],
        role: "region",
        className: classes.region,
        children
      })
    }))]
  }));
});
function getAccordionDetailsUtilityClass(slot) {
  return generateUtilityClass$2("MuiAccordionDetails", slot);
}
generateUtilityClasses("MuiAccordionDetails", ["root"]);
const _excluded$11 = ["className"];
const useThemeProps$8 = createUseThemeProps();
const useUtilityClasses$Z = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getAccordionDetailsUtilityClass, classes);
};
const AccordionDetailsRoot = styled("div", {
  name: "MuiAccordionDetails",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => ({
  padding: theme.spacing(1, 2, 2)
}));
const AccordionDetails = /* @__PURE__ */ reactExports.forwardRef(function AccordionDetails2(inProps, ref) {
  const props = useThemeProps$8({
    props: inProps,
    name: "MuiAccordionDetails"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$11);
  const ownerState = props;
  const classes = useUtilityClasses$Z(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionDetailsRoot, _extends({
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other));
});
function getAccordionSummaryUtilityClass(slot) {
  return generateUtilityClass$2("MuiAccordionSummary", slot);
}
const accordionSummaryClasses = generateUtilityClasses("MuiAccordionSummary", ["root", "expanded", "focusVisible", "disabled", "gutters", "contentGutters", "content", "expandIconWrapper"]);
const _excluded$10 = ["children", "className", "expandIcon", "focusVisibleClassName", "onClick"];
const useThemeProps$7 = createUseThemeProps();
const useUtilityClasses$Y = (ownerState) => {
  const {
    classes,
    expanded,
    disabled,
    disableGutters
  } = ownerState;
  const slots = {
    root: ["root", expanded && "expanded", disabled && "disabled", !disableGutters && "gutters"],
    focusVisible: ["focusVisible"],
    content: ["content", expanded && "expanded", !disableGutters && "contentGutters"],
    expandIconWrapper: ["expandIconWrapper", expanded && "expanded"]
  };
  return composeClasses(slots, getAccordionSummaryUtilityClass, classes);
};
const AccordionSummaryRoot = styled(ButtonBase, {
  name: "MuiAccordionSummary",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => {
  const transition = {
    duration: theme.transitions.duration.shortest
  };
  return {
    display: "flex",
    minHeight: 48,
    padding: theme.spacing(0, 2),
    transition: theme.transitions.create(["min-height", "background-color"], transition),
    [`&.${accordionSummaryClasses.focusVisible}`]: {
      backgroundColor: (theme.vars || theme).palette.action.focus
    },
    [`&.${accordionSummaryClasses.disabled}`]: {
      opacity: (theme.vars || theme).palette.action.disabledOpacity
    },
    [`&:hover:not(.${accordionSummaryClasses.disabled})`]: {
      cursor: "pointer"
    },
    variants: [{
      props: (props) => !props.disableGutters,
      style: {
        [`&.${accordionSummaryClasses.expanded}`]: {
          minHeight: 64
        }
      }
    }]
  };
});
const AccordionSummaryContent = styled("div", {
  name: "MuiAccordionSummary",
  slot: "Content",
  overridesResolver: (props, styles2) => styles2.content
})(({
  theme
}) => ({
  display: "flex",
  flexGrow: 1,
  margin: "12px 0",
  variants: [{
    props: (props) => !props.disableGutters,
    style: {
      transition: theme.transitions.create(["margin"], {
        duration: theme.transitions.duration.shortest
      }),
      [`&.${accordionSummaryClasses.expanded}`]: {
        margin: "20px 0"
      }
    }
  }]
}));
const AccordionSummaryExpandIconWrapper = styled("div", {
  name: "MuiAccordionSummary",
  slot: "ExpandIconWrapper",
  overridesResolver: (props, styles2) => styles2.expandIconWrapper
})(({
  theme
}) => ({
  display: "flex",
  color: (theme.vars || theme).palette.action.active,
  transform: "rotate(0deg)",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest
  }),
  [`&.${accordionSummaryClasses.expanded}`]: {
    transform: "rotate(180deg)"
  }
}));
const AccordionSummary = /* @__PURE__ */ reactExports.forwardRef(function AccordionSummary2(inProps, ref) {
  const props = useThemeProps$7({
    props: inProps,
    name: "MuiAccordionSummary"
  });
  const {
    children,
    className,
    expandIcon,
    focusVisibleClassName,
    onClick
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$10);
  const {
    disabled = false,
    disableGutters,
    expanded,
    toggle
  } = reactExports.useContext(AccordionContext);
  const handleChange = (event) => {
    if (toggle) {
      toggle(event);
    }
    if (onClick) {
      onClick(event);
    }
  };
  const ownerState = _extends({}, props, {
    expanded,
    disabled,
    disableGutters
  });
  const classes = useUtilityClasses$Y(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionSummaryRoot, _extends({
    focusRipple: false,
    disableRipple: true,
    disabled,
    component: "div",
    "aria-expanded": expanded,
    className: clsx(classes.root, className),
    focusVisibleClassName: clsx(classes.focusVisible, focusVisibleClassName),
    onClick: handleChange,
    ref,
    ownerState
  }, other, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AccordionSummaryContent, {
      className: classes.content,
      ownerState,
      children
    }), expandIcon && /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionSummaryExpandIconWrapper, {
      className: classes.expandIconWrapper,
      ownerState,
      children: expandIcon
    })]
  }));
});
function getAlertUtilityClass(slot) {
  return generateUtilityClass$2("MuiAlert", slot);
}
const alertClasses = generateUtilityClasses("MuiAlert", ["root", "action", "icon", "message", "filled", "colorSuccess", "colorInfo", "colorWarning", "colorError", "filledSuccess", "filledInfo", "filledWarning", "filledError", "outlined", "outlinedSuccess", "outlinedInfo", "outlinedWarning", "outlinedError", "standard", "standardSuccess", "standardInfo", "standardWarning", "standardError"]);
const SuccessOutlinedIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2, 4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0, 0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"
}), "SuccessOutlined");
const ReportProblemOutlinedIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"
}), "ReportProblemOutlined");
const ErrorOutlineIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
}), "ErrorOutline");
const InfoOutlinedIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20, 12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10, 10 0 0,0 12,2M11,17H13V11H11V17Z"
}), "InfoOutlined");
const ClearIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
}), "Close");
const _excluded$$ = ["action", "children", "className", "closeText", "color", "components", "componentsProps", "icon", "iconMapping", "onClose", "role", "severity", "slotProps", "slots", "variant"];
const useThemeProps$6 = createUseThemeProps();
const useUtilityClasses$X = (ownerState) => {
  const {
    variant,
    color: color2,
    severity,
    classes
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2 || severity)}`, `${variant}${capitalize$1(color2 || severity)}`, `${variant}`],
    icon: ["icon"],
    message: ["message"],
    action: ["action"]
  };
  return composeClasses(slots, getAlertUtilityClass, classes);
};
const AlertRoot = styled(Paper, {
  name: "MuiAlert",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], styles2[`${ownerState.variant}${capitalize$1(ownerState.color || ownerState.severity)}`]];
  }
})(({
  theme
}) => {
  const getColor = theme.palette.mode === "light" ? darken_1 : lighten_1;
  const getBackgroundColor = theme.palette.mode === "light" ? lighten_1 : darken_1;
  return _extends({}, theme.typography.body2, {
    backgroundColor: "transparent",
    display: "flex",
    padding: "6px 16px",
    variants: [...Object.entries(theme.palette).filter(([, value]) => value.main && value.light).map(([color2]) => ({
      props: {
        colorSeverity: color2,
        variant: "standard"
      },
      style: {
        color: theme.vars ? theme.vars.palette.Alert[`${color2}Color`] : getColor(theme.palette[color2].light, 0.6),
        backgroundColor: theme.vars ? theme.vars.palette.Alert[`${color2}StandardBg`] : getBackgroundColor(theme.palette[color2].light, 0.9),
        [`& .${alertClasses.icon}`]: theme.vars ? {
          color: theme.vars.palette.Alert[`${color2}IconColor`]
        } : {
          color: theme.palette[color2].main
        }
      }
    })), ...Object.entries(theme.palette).filter(([, value]) => value.main && value.light).map(([color2]) => ({
      props: {
        colorSeverity: color2,
        variant: "outlined"
      },
      style: {
        color: theme.vars ? theme.vars.palette.Alert[`${color2}Color`] : getColor(theme.palette[color2].light, 0.6),
        border: `1px solid ${(theme.vars || theme).palette[color2].light}`,
        [`& .${alertClasses.icon}`]: theme.vars ? {
          color: theme.vars.palette.Alert[`${color2}IconColor`]
        } : {
          color: theme.palette[color2].main
        }
      }
    })), ...Object.entries(theme.palette).filter(([, value]) => value.main && value.dark).map(([color2]) => ({
      props: {
        colorSeverity: color2,
        variant: "filled"
      },
      style: _extends({
        fontWeight: theme.typography.fontWeightMedium
      }, theme.vars ? {
        color: theme.vars.palette.Alert[`${color2}FilledColor`],
        backgroundColor: theme.vars.palette.Alert[`${color2}FilledBg`]
      } : {
        backgroundColor: theme.palette.mode === "dark" ? theme.palette[color2].dark : theme.palette[color2].main,
        color: theme.palette.getContrastText(theme.palette[color2].main)
      })
    }))]
  });
});
const AlertIcon = styled("div", {
  name: "MuiAlert",
  slot: "Icon",
  overridesResolver: (props, styles2) => styles2.icon
})({
  marginRight: 12,
  padding: "7px 0",
  display: "flex",
  fontSize: 22,
  opacity: 0.9
});
const AlertMessage = styled("div", {
  name: "MuiAlert",
  slot: "Message",
  overridesResolver: (props, styles2) => styles2.message
})({
  padding: "8px 0",
  minWidth: 0,
  overflow: "auto"
});
const AlertAction = styled("div", {
  name: "MuiAlert",
  slot: "Action",
  overridesResolver: (props, styles2) => styles2.action
})({
  display: "flex",
  alignItems: "flex-start",
  padding: "4px 0 0 16px",
  marginLeft: "auto",
  marginRight: -8
});
const defaultIconMapping = {
  success: /* @__PURE__ */ jsxRuntimeExports.jsx(SuccessOutlinedIcon, {
    fontSize: "inherit"
  }),
  warning: /* @__PURE__ */ jsxRuntimeExports.jsx(ReportProblemOutlinedIcon, {
    fontSize: "inherit"
  }),
  error: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorOutlineIcon, {
    fontSize: "inherit"
  }),
  info: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoOutlinedIcon, {
    fontSize: "inherit"
  })
};
const Alert = /* @__PURE__ */ reactExports.forwardRef(function Alert2(inProps, ref) {
  const props = useThemeProps$6({
    props: inProps,
    name: "MuiAlert"
  });
  const {
    action,
    children,
    className,
    closeText = "Close",
    color: color2,
    components = {},
    componentsProps = {},
    icon,
    iconMapping = defaultIconMapping,
    onClose,
    role = "alert",
    severity = "success",
    slotProps = {},
    slots = {},
    variant = "standard"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$$);
  const ownerState = _extends({}, props, {
    color: color2,
    severity,
    variant,
    colorSeverity: color2 || severity
  });
  const classes = useUtilityClasses$X(ownerState);
  const externalForwardedProps = {
    slots: _extends({
      closeButton: components.CloseButton,
      closeIcon: components.CloseIcon
    }, slots),
    slotProps: _extends({}, componentsProps, slotProps)
  };
  const [CloseButtonSlot, closeButtonProps] = useSlot("closeButton", {
    elementType: IconButton,
    externalForwardedProps,
    ownerState
  });
  const [CloseIconSlot, closeIconProps] = useSlot("closeIcon", {
    elementType: ClearIcon,
    externalForwardedProps,
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertRoot, _extends({
    role,
    elevation: 0,
    ownerState,
    className: clsx(classes.root, className),
    ref
  }, other, {
    children: [icon !== false ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertIcon, {
      ownerState,
      className: classes.icon,
      children: icon || iconMapping[severity] || defaultIconMapping[severity]
    }) : null, /* @__PURE__ */ jsxRuntimeExports.jsx(AlertMessage, {
      ownerState,
      className: classes.message,
      children
    }), action != null ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertAction, {
      ownerState,
      className: classes.action,
      children: action
    }) : null, action == null && onClose ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertAction, {
      ownerState,
      className: classes.action,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseButtonSlot, _extends({
        size: "small",
        "aria-label": closeText,
        title: closeText,
        color: "inherit",
        onClick: onClose
      }, closeButtonProps, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIconSlot, _extends({
          fontSize: "small"
        }, closeIconProps))
      }))
    }) : null]
  }));
});
function getAlertTitleUtilityClass(slot) {
  return generateUtilityClass$2("MuiAlertTitle", slot);
}
generateUtilityClasses("MuiAlertTitle", ["root"]);
const _excluded$_ = ["className"];
const useThemeProps$5 = createUseThemeProps();
const useUtilityClasses$W = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getAlertTitleUtilityClass, classes);
};
const AlertTitleRoot = styled(Typography, {
  name: "MuiAlertTitle",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => {
  return {
    fontWeight: theme.typography.fontWeightMedium,
    marginTop: -2
  };
});
const AlertTitle = /* @__PURE__ */ reactExports.forwardRef(function AlertTitle2(inProps, ref) {
  const props = useThemeProps$5({
    props: inProps,
    name: "MuiAlertTitle"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$_);
  const ownerState = props;
  const classes = useUtilityClasses$W(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitleRoot, _extends({
    gutterBottom: true,
    component: "div",
    ownerState,
    ref,
    className: clsx(classes.root, className)
  }, other));
});
function getAppBarUtilityClass(slot) {
  return generateUtilityClass$2("MuiAppBar", slot);
}
generateUtilityClasses("MuiAppBar", ["root", "positionFixed", "positionAbsolute", "positionSticky", "positionStatic", "positionRelative", "colorDefault", "colorPrimary", "colorSecondary", "colorInherit", "colorTransparent", "colorError", "colorInfo", "colorSuccess", "colorWarning"]);
const _excluded$Z = ["className", "color", "enableColorOnDark", "position"];
const useUtilityClasses$V = (ownerState) => {
  const {
    color: color2,
    position: position2,
    classes
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2)}`, `position${capitalize$1(position2)}`]
  };
  return composeClasses(slots, getAppBarUtilityClass, classes);
};
const joinVars = (var1, var2) => var1 ? `${var1 == null ? void 0 : var1.replace(")", "")}, ${var2})` : var2;
const AppBarRoot = styled(Paper, {
  name: "MuiAppBar",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`position${capitalize$1(ownerState.position)}`], styles2[`color${capitalize$1(ownerState.color)}`]];
  }
})(({
  theme,
  ownerState
}) => {
  const backgroundColorDefault = theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.grey[900];
  return _extends({
    display: "flex",
    flexDirection: "column",
    width: "100%",
    boxSizing: "border-box",
    // Prevent padding issue with the Modal and fixed positioned AppBar.
    flexShrink: 0
  }, ownerState.position === "fixed" && {
    position: "fixed",
    zIndex: (theme.vars || theme).zIndex.appBar,
    top: 0,
    left: "auto",
    right: 0,
    "@media print": {
      // Prevent the app bar to be visible on each printed page.
      position: "absolute"
    }
  }, ownerState.position === "absolute" && {
    position: "absolute",
    zIndex: (theme.vars || theme).zIndex.appBar,
    top: 0,
    left: "auto",
    right: 0
  }, ownerState.position === "sticky" && {
    // ⚠️ sticky is not supported by IE11.
    position: "sticky",
    zIndex: (theme.vars || theme).zIndex.appBar,
    top: 0,
    left: "auto",
    right: 0
  }, ownerState.position === "static" && {
    position: "static"
  }, ownerState.position === "relative" && {
    position: "relative"
  }, !theme.vars && _extends({}, ownerState.color === "default" && {
    backgroundColor: backgroundColorDefault,
    color: theme.palette.getContrastText(backgroundColorDefault)
  }, ownerState.color && ownerState.color !== "default" && ownerState.color !== "inherit" && ownerState.color !== "transparent" && {
    backgroundColor: theme.palette[ownerState.color].main,
    color: theme.palette[ownerState.color].contrastText
  }, ownerState.color === "inherit" && {
    color: "inherit"
  }, theme.palette.mode === "dark" && !ownerState.enableColorOnDark && {
    backgroundColor: null,
    color: null
  }, ownerState.color === "transparent" && _extends({
    backgroundColor: "transparent",
    color: "inherit"
  }, theme.palette.mode === "dark" && {
    backgroundImage: "none"
  })), theme.vars && _extends({}, ownerState.color === "default" && {
    "--AppBar-background": ownerState.enableColorOnDark ? theme.vars.palette.AppBar.defaultBg : joinVars(theme.vars.palette.AppBar.darkBg, theme.vars.palette.AppBar.defaultBg),
    "--AppBar-color": ownerState.enableColorOnDark ? theme.vars.palette.text.primary : joinVars(theme.vars.palette.AppBar.darkColor, theme.vars.palette.text.primary)
  }, ownerState.color && !ownerState.color.match(/^(default|inherit|transparent)$/) && {
    "--AppBar-background": ownerState.enableColorOnDark ? theme.vars.palette[ownerState.color].main : joinVars(theme.vars.palette.AppBar.darkBg, theme.vars.palette[ownerState.color].main),
    "--AppBar-color": ownerState.enableColorOnDark ? theme.vars.palette[ownerState.color].contrastText : joinVars(theme.vars.palette.AppBar.darkColor, theme.vars.palette[ownerState.color].contrastText)
  }, {
    backgroundColor: "var(--AppBar-background)",
    color: ownerState.color === "inherit" ? "inherit" : "var(--AppBar-color)"
  }, ownerState.color === "transparent" && {
    backgroundImage: "none",
    backgroundColor: "transparent",
    color: "inherit"
  }));
});
const AppBar = /* @__PURE__ */ reactExports.forwardRef(function AppBar2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiAppBar"
  });
  const {
    className,
    color: color2 = "primary",
    enableColorOnDark = false,
    position: position2 = "fixed"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$Z);
  const ownerState = _extends({}, props, {
    color: color2,
    position: position2,
    enableColorOnDark
  });
  const classes = useUtilityClasses$V(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppBarRoot, _extends({
    square: true,
    component: "header",
    ownerState,
    elevation: 4,
    className: clsx(classes.root, className, position2 === "fixed" && "mui-fixed"),
    ref
  }, other));
});
function getListSubheaderUtilityClass(slot) {
  return generateUtilityClass$2("MuiListSubheader", slot);
}
generateUtilityClasses("MuiListSubheader", ["root", "colorPrimary", "colorInherit", "gutters", "inset", "sticky"]);
const _excluded$Y = ["className", "color", "component", "disableGutters", "disableSticky", "inset"];
const useUtilityClasses$U = (ownerState) => {
  const {
    classes,
    color: color2,
    disableGutters,
    inset,
    disableSticky
  } = ownerState;
  const slots = {
    root: ["root", color2 !== "default" && `color${capitalize$1(color2)}`, !disableGutters && "gutters", inset && "inset", !disableSticky && "sticky"]
  };
  return composeClasses(slots, getListSubheaderUtilityClass, classes);
};
const ListSubheaderRoot = styled("li", {
  name: "MuiListSubheader",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.color !== "default" && styles2[`color${capitalize$1(ownerState.color)}`], !ownerState.disableGutters && styles2.gutters, ownerState.inset && styles2.inset, !ownerState.disableSticky && styles2.sticky];
  }
})(({
  theme,
  ownerState
}) => _extends({
  boxSizing: "border-box",
  lineHeight: "48px",
  listStyle: "none",
  color: (theme.vars || theme).palette.text.secondary,
  fontFamily: theme.typography.fontFamily,
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.pxToRem(14)
}, ownerState.color === "primary" && {
  color: (theme.vars || theme).palette.primary.main
}, ownerState.color === "inherit" && {
  color: "inherit"
}, !ownerState.disableGutters && {
  paddingLeft: 16,
  paddingRight: 16
}, ownerState.inset && {
  paddingLeft: 72
}, !ownerState.disableSticky && {
  position: "sticky",
  top: 0,
  zIndex: 1,
  backgroundColor: (theme.vars || theme).palette.background.paper
}));
const ListSubheader = /* @__PURE__ */ reactExports.forwardRef(function ListSubheader2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiListSubheader"
  });
  const {
    className,
    color: color2 = "default",
    component = "li",
    disableGutters = false,
    disableSticky = false,
    inset = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$Y);
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    disableGutters,
    disableSticky,
    inset
  });
  const classes = useUtilityClasses$U(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListSubheaderRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other));
});
ListSubheader.muiSkipListHighlight = true;
function getAutocompleteUtilityClass(slot) {
  return generateUtilityClass$2("MuiAutocomplete", slot);
}
const autocompleteClasses = generateUtilityClasses("MuiAutocomplete", ["root", "expanded", "fullWidth", "focused", "focusVisible", "tag", "tagSizeSmall", "tagSizeMedium", "hasPopupIcon", "hasClearIcon", "inputRoot", "input", "inputFocused", "endAdornment", "clearIndicator", "popupIndicator", "popupIndicatorOpen", "popper", "popperDisablePortal", "paper", "listbox", "loading", "noOptions", "option", "groupLabel", "groupUl"]);
var _ClearIcon, _ArrowDropDownIcon;
const _excluded$X = ["autoComplete", "autoHighlight", "autoSelect", "blurOnSelect", "ChipProps", "className", "clearIcon", "clearOnBlur", "clearOnEscape", "clearText", "closeText", "componentsProps", "defaultValue", "disableClearable", "disableCloseOnSelect", "disabled", "disabledItemsFocusable", "disableListWrap", "disablePortal", "filterOptions", "filterSelectedOptions", "forcePopupIcon", "freeSolo", "fullWidth", "getLimitTagsText", "getOptionDisabled", "getOptionKey", "getOptionLabel", "isOptionEqualToValue", "groupBy", "handleHomeEndKeys", "id", "includeInputInList", "inputValue", "limitTags", "ListboxComponent", "ListboxProps", "loading", "loadingText", "multiple", "noOptionsText", "onChange", "onClose", "onHighlightChange", "onInputChange", "onOpen", "open", "openOnFocus", "openText", "options", "PaperComponent", "PopperComponent", "popupIcon", "readOnly", "renderGroup", "renderInput", "renderOption", "renderTags", "selectOnFocus", "size", "slotProps", "value"], _excluded2$5 = ["ref"];
const useThemeProps$4 = createUseThemeProps();
const useUtilityClasses$T = (ownerState) => {
  const {
    classes,
    disablePortal,
    expanded,
    focused,
    fullWidth,
    hasClearIcon,
    hasPopupIcon,
    inputFocused,
    popupOpen,
    size
  } = ownerState;
  const slots = {
    root: ["root", expanded && "expanded", focused && "focused", fullWidth && "fullWidth", hasClearIcon && "hasClearIcon", hasPopupIcon && "hasPopupIcon"],
    inputRoot: ["inputRoot"],
    input: ["input", inputFocused && "inputFocused"],
    tag: ["tag", `tagSize${capitalize$1(size)}`],
    endAdornment: ["endAdornment"],
    clearIndicator: ["clearIndicator"],
    popupIndicator: ["popupIndicator", popupOpen && "popupIndicatorOpen"],
    popper: ["popper", disablePortal && "popperDisablePortal"],
    paper: ["paper"],
    listbox: ["listbox"],
    loading: ["loading"],
    noOptions: ["noOptions"],
    option: ["option"],
    groupLabel: ["groupLabel"],
    groupUl: ["groupUl"]
  };
  return composeClasses(slots, getAutocompleteUtilityClass, classes);
};
const AutocompleteRoot = styled("div", {
  name: "MuiAutocomplete",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    const {
      fullWidth,
      hasClearIcon,
      hasPopupIcon,
      inputFocused,
      size
    } = ownerState;
    return [{
      [`& .${autocompleteClasses.tag}`]: styles2.tag
    }, {
      [`& .${autocompleteClasses.tag}`]: styles2[`tagSize${capitalize$1(size)}`]
    }, {
      [`& .${autocompleteClasses.inputRoot}`]: styles2.inputRoot
    }, {
      [`& .${autocompleteClasses.input}`]: styles2.input
    }, {
      [`& .${autocompleteClasses.input}`]: inputFocused && styles2.inputFocused
    }, styles2.root, fullWidth && styles2.fullWidth, hasPopupIcon && styles2.hasPopupIcon, hasClearIcon && styles2.hasClearIcon];
  }
})({
  [`&.${autocompleteClasses.focused} .${autocompleteClasses.clearIndicator}`]: {
    visibility: "visible"
  },
  /* Avoid double tap issue on iOS */
  "@media (pointer: fine)": {
    [`&:hover .${autocompleteClasses.clearIndicator}`]: {
      visibility: "visible"
    }
  },
  [`& .${autocompleteClasses.tag}`]: {
    margin: 3,
    maxWidth: "calc(100% - 6px)"
  },
  [`& .${autocompleteClasses.inputRoot}`]: {
    flexWrap: "wrap",
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4
    },
    [`& .${autocompleteClasses.input}`]: {
      width: 0,
      minWidth: 30
    }
  },
  [`& .${inputClasses.root}`]: {
    paddingBottom: 1,
    "& .MuiInput-input": {
      padding: "4px 4px 4px 0px"
    }
  },
  [`& .${inputClasses.root}.${inputBaseClasses.sizeSmall}`]: {
    [`& .${inputClasses.input}`]: {
      padding: "2px 4px 3px 0"
    }
  },
  [`& .${outlinedInputClasses.root}`]: {
    padding: 9,
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4 + 9
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4 + 9
    },
    [`& .${autocompleteClasses.input}`]: {
      padding: "7.5px 4px 7.5px 5px"
    },
    [`& .${autocompleteClasses.endAdornment}`]: {
      right: 9
    }
  },
  [`& .${outlinedInputClasses.root}.${inputBaseClasses.sizeSmall}`]: {
    // Don't specify paddingRight, as it overrides the default value set when there is only
    // one of the popup or clear icon as the specificity is equal so the latter one wins
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    [`& .${autocompleteClasses.input}`]: {
      padding: "2.5px 4px 2.5px 8px"
    }
  },
  [`& .${filledInputClasses.root}`]: {
    paddingTop: 19,
    paddingLeft: 8,
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4 + 9
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4 + 9
    },
    [`& .${filledInputClasses.input}`]: {
      padding: "7px 4px"
    },
    [`& .${autocompleteClasses.endAdornment}`]: {
      right: 9
    }
  },
  [`& .${filledInputClasses.root}.${inputBaseClasses.sizeSmall}`]: {
    paddingBottom: 1,
    [`& .${filledInputClasses.input}`]: {
      padding: "2.5px 4px"
    }
  },
  [`& .${inputBaseClasses.hiddenLabel}`]: {
    paddingTop: 8
  },
  [`& .${filledInputClasses.root}.${inputBaseClasses.hiddenLabel}`]: {
    paddingTop: 0,
    paddingBottom: 0,
    [`& .${autocompleteClasses.input}`]: {
      paddingTop: 16,
      paddingBottom: 17
    }
  },
  [`& .${filledInputClasses.root}.${inputBaseClasses.hiddenLabel}.${inputBaseClasses.sizeSmall}`]: {
    [`& .${autocompleteClasses.input}`]: {
      paddingTop: 8,
      paddingBottom: 9
    }
  },
  [`& .${autocompleteClasses.input}`]: {
    flexGrow: 1,
    textOverflow: "ellipsis",
    opacity: 0
  },
  variants: [{
    props: {
      fullWidth: true
    },
    style: {
      width: "100%"
    }
  }, {
    props: {
      size: "small"
    },
    style: {
      [`& .${autocompleteClasses.tag}`]: {
        margin: 2,
        maxWidth: "calc(100% - 4px)"
      }
    }
  }, {
    props: {
      inputFocused: true
    },
    style: {
      [`& .${autocompleteClasses.input}`]: {
        opacity: 1
      }
    }
  }]
});
const AutocompleteEndAdornment = styled("div", {
  name: "MuiAutocomplete",
  slot: "EndAdornment",
  overridesResolver: (props, styles2) => styles2.endAdornment
})({
  // We use a position absolute to support wrapping tags.
  position: "absolute",
  right: 0,
  top: "50%",
  transform: "translate(0, -50%)"
});
const AutocompleteClearIndicator = styled(IconButton, {
  name: "MuiAutocomplete",
  slot: "ClearIndicator",
  overridesResolver: (props, styles2) => styles2.clearIndicator
})({
  marginRight: -2,
  padding: 4,
  visibility: "hidden"
});
const AutocompletePopupIndicator = styled(IconButton, {
  name: "MuiAutocomplete",
  slot: "PopupIndicator",
  overridesResolver: ({
    ownerState
  }, styles2) => _extends({}, styles2.popupIndicator, ownerState.popupOpen && styles2.popupIndicatorOpen)
})({
  padding: 2,
  marginRight: -2,
  variants: [{
    props: {
      popupOpen: true
    },
    style: {
      transform: "rotate(180deg)"
    }
  }]
});
const AutocompletePopper = styled(Popper$1, {
  name: "MuiAutocomplete",
  slot: "Popper",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${autocompleteClasses.option}`]: styles2.option
    }, styles2.popper, ownerState.disablePortal && styles2.popperDisablePortal];
  }
})(({
  theme
}) => ({
  zIndex: (theme.vars || theme).zIndex.modal,
  variants: [{
    props: {
      disablePortal: true
    },
    style: {
      position: "absolute"
    }
  }]
}));
const AutocompletePaper = styled(Paper, {
  name: "MuiAutocomplete",
  slot: "Paper",
  overridesResolver: (props, styles2) => styles2.paper
})(({
  theme
}) => _extends({}, theme.typography.body1, {
  overflow: "auto"
}));
const AutocompleteLoading = styled("div", {
  name: "MuiAutocomplete",
  slot: "Loading",
  overridesResolver: (props, styles2) => styles2.loading
})(({
  theme
}) => ({
  color: (theme.vars || theme).palette.text.secondary,
  padding: "14px 16px"
}));
const AutocompleteNoOptions = styled("div", {
  name: "MuiAutocomplete",
  slot: "NoOptions",
  overridesResolver: (props, styles2) => styles2.noOptions
})(({
  theme
}) => ({
  color: (theme.vars || theme).palette.text.secondary,
  padding: "14px 16px"
}));
const AutocompleteListbox = styled("div", {
  name: "MuiAutocomplete",
  slot: "Listbox",
  overridesResolver: (props, styles2) => styles2.listbox
})(({
  theme
}) => ({
  listStyle: "none",
  margin: 0,
  padding: "8px 0",
  maxHeight: "40vh",
  overflow: "auto",
  position: "relative",
  [`& .${autocompleteClasses.option}`]: {
    minHeight: 48,
    display: "flex",
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
    cursor: "pointer",
    paddingTop: 6,
    boxSizing: "border-box",
    outline: "0",
    WebkitTapHighlightColor: "transparent",
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    [theme.breakpoints.up("sm")]: {
      minHeight: "auto"
    },
    [`&.${autocompleteClasses.focused}`]: {
      backgroundColor: (theme.vars || theme).palette.action.hover,
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    },
    '&[aria-disabled="true"]': {
      opacity: (theme.vars || theme).palette.action.disabledOpacity,
      pointerEvents: "none"
    },
    [`&.${autocompleteClasses.focusVisible}`]: {
      backgroundColor: (theme.vars || theme).palette.action.focus
    },
    '&[aria-selected="true"]': {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      [`&.${autocompleteClasses.focused}`]: {
        backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
        // Reset on touch devices, it doesn't add specificity
        "@media (hover: none)": {
          backgroundColor: (theme.vars || theme).palette.action.selected
        }
      },
      [`&.${autocompleteClasses.focusVisible}`]: {
        backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.focusOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity)
      }
    }
  }
}));
const AutocompleteGroupLabel = styled(ListSubheader, {
  name: "MuiAutocomplete",
  slot: "GroupLabel",
  overridesResolver: (props, styles2) => styles2.groupLabel
})(({
  theme
}) => ({
  backgroundColor: (theme.vars || theme).palette.background.paper,
  top: -8
}));
const AutocompleteGroupUl = styled("ul", {
  name: "MuiAutocomplete",
  slot: "GroupUl",
  overridesResolver: (props, styles2) => styles2.groupUl
})({
  padding: 0,
  [`& .${autocompleteClasses.option}`]: {
    paddingLeft: 24
  }
});
const Autocomplete = /* @__PURE__ */ reactExports.forwardRef(function Autocomplete2(inProps, ref) {
  var _slotProps$clearIndic, _slotProps$paper, _slotProps$popper, _slotProps$popupIndic;
  const props = useThemeProps$4({
    props: inProps,
    name: "MuiAutocomplete"
  });
  const {
    autoComplete = false,
    autoHighlight = false,
    autoSelect = false,
    blurOnSelect = false,
    ChipProps,
    className,
    clearIcon = _ClearIcon || (_ClearIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(ClearIcon, {
      fontSize: "small"
    })),
    clearOnBlur = !props.freeSolo,
    clearOnEscape = false,
    clearText = "Clear",
    closeText = "Close",
    componentsProps = {},
    defaultValue = props.multiple ? [] : null,
    disableClearable = false,
    disableCloseOnSelect = false,
    disabled = false,
    disabledItemsFocusable = false,
    disableListWrap = false,
    disablePortal = false,
    filterSelectedOptions = false,
    forcePopupIcon = "auto",
    freeSolo = false,
    fullWidth = false,
    getLimitTagsText = (more) => `+${more}`,
    getOptionLabel: getOptionLabelProp,
    groupBy,
    handleHomeEndKeys = !props.freeSolo,
    includeInputInList = false,
    limitTags = -1,
    ListboxComponent = "ul",
    ListboxProps,
    loading = false,
    loadingText = "Loading…",
    multiple = false,
    noOptionsText = "No options",
    openOnFocus = false,
    openText = "Open",
    PaperComponent = Paper,
    PopperComponent = Popper$1,
    popupIcon = _ArrowDropDownIcon || (_ArrowDropDownIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDropDownIcon, {})),
    readOnly = false,
    renderGroup: renderGroupProp,
    renderInput,
    renderOption: renderOptionProp,
    renderTags,
    selectOnFocus = !props.freeSolo,
    size = "medium",
    slotProps = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$X);
  const {
    getRootProps,
    getInputProps,
    getInputLabelProps,
    getPopupIndicatorProps,
    getClearProps,
    getTagProps,
    getListboxProps,
    getOptionProps,
    value,
    dirty,
    expanded,
    id,
    popupOpen,
    focused,
    focusedTag,
    anchorEl,
    setAnchorEl,
    inputValue,
    groupedOptions
  } = useAutocomplete(_extends({}, props, {
    componentName: "Autocomplete"
  }));
  const hasClearIcon = !disableClearable && !disabled && dirty && !readOnly;
  const hasPopupIcon = (!freeSolo || forcePopupIcon === true) && forcePopupIcon !== false;
  const {
    onMouseDown: handleInputMouseDown
  } = getInputProps();
  const {
    ref: externalListboxRef
  } = ListboxProps != null ? ListboxProps : {};
  const _getListboxProps = getListboxProps(), {
    ref: listboxRef
  } = _getListboxProps, otherListboxProps = _objectWithoutPropertiesLoose(_getListboxProps, _excluded2$5);
  const combinedListboxRef = useForkRef(listboxRef, externalListboxRef);
  const defaultGetOptionLabel = (option) => {
    var _option$label;
    return (_option$label = option.label) != null ? _option$label : option;
  };
  const getOptionLabel = getOptionLabelProp || defaultGetOptionLabel;
  const ownerState = _extends({}, props, {
    disablePortal,
    expanded,
    focused,
    fullWidth,
    getOptionLabel,
    hasClearIcon,
    hasPopupIcon,
    inputFocused: focusedTag === -1,
    popupOpen,
    size
  });
  const classes = useUtilityClasses$T(ownerState);
  let startAdornment;
  if (multiple && value.length > 0) {
    const getCustomizedTagProps = (params) => _extends({
      className: classes.tag,
      disabled
    }, getTagProps(params));
    if (renderTags) {
      startAdornment = renderTags(value, getCustomizedTagProps, ownerState);
    } else {
      startAdornment = value.map((option, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, _extends({
        label: getOptionLabel(option),
        size
      }, getCustomizedTagProps({
        index
      }), ChipProps)));
    }
  }
  if (limitTags > -1 && Array.isArray(startAdornment)) {
    const more = startAdornment.length - limitTags;
    if (!focused && more > 0) {
      startAdornment = startAdornment.splice(0, limitTags);
      startAdornment.push(/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: classes.tag,
        children: getLimitTagsText(more)
      }, startAdornment.length));
    }
  }
  const defaultRenderGroup = (params) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteGroupLabel, {
      className: classes.groupLabel,
      ownerState,
      component: "div",
      children: params.group
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteGroupUl, {
      className: classes.groupUl,
      ownerState,
      children: params.children
    })]
  }, params.key);
  const renderGroup = renderGroupProp || defaultRenderGroup;
  const defaultRenderOption = (props2, option) => {
    return /* @__PURE__ */ reactExports.createElement("li", _extends({}, props2, {
      key: props2.key
    }), getOptionLabel(option));
  };
  const renderOption = renderOptionProp || defaultRenderOption;
  const renderListOption = (option, index) => {
    const optionProps = getOptionProps({
      option,
      index
    });
    return renderOption(_extends({}, optionProps, {
      className: classes.option
    }), option, {
      selected: optionProps["aria-selected"],
      index,
      inputValue
    }, ownerState);
  };
  const clearIndicatorSlotProps = (_slotProps$clearIndic = slotProps.clearIndicator) != null ? _slotProps$clearIndic : componentsProps.clearIndicator;
  const paperSlotProps = (_slotProps$paper = slotProps.paper) != null ? _slotProps$paper : componentsProps.paper;
  const popperSlotProps = (_slotProps$popper = slotProps.popper) != null ? _slotProps$popper : componentsProps.popper;
  const popupIndicatorSlotProps = (_slotProps$popupIndic = slotProps.popupIndicator) != null ? _slotProps$popupIndic : componentsProps.popupIndicator;
  const renderAutocompletePopperChildren = (children) => /* @__PURE__ */ jsxRuntimeExports.jsx(AutocompletePopper, _extends({
    as: PopperComponent,
    disablePortal,
    style: {
      width: anchorEl ? anchorEl.clientWidth : null
    },
    ownerState,
    role: "presentation",
    anchorEl,
    open: popupOpen
  }, popperSlotProps, {
    className: clsx(classes.popper, popperSlotProps == null ? void 0 : popperSlotProps.className),
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(AutocompletePaper, _extends({
      ownerState,
      as: PaperComponent
    }, paperSlotProps, {
      className: clsx(classes.paper, paperSlotProps == null ? void 0 : paperSlotProps.className),
      children
    }))
  }));
  let autocompletePopper = null;
  if (groupedOptions.length > 0) {
    autocompletePopper = renderAutocompletePopperChildren(/* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteListbox, _extends({
      as: ListboxComponent,
      className: classes.listbox,
      ownerState
    }, otherListboxProps, ListboxProps, {
      ref: combinedListboxRef,
      children: groupedOptions.map((option, index) => {
        if (groupBy) {
          return renderGroup({
            key: option.key,
            group: option.group,
            children: option.options.map((option2, index2) => renderListOption(option2, option.index + index2))
          });
        }
        return renderListOption(option, index);
      })
    })));
  } else if (loading && groupedOptions.length === 0) {
    autocompletePopper = renderAutocompletePopperChildren(/* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteLoading, {
      className: classes.loading,
      ownerState,
      children: loadingText
    }));
  } else if (groupedOptions.length === 0 && !freeSolo && !loading) {
    autocompletePopper = renderAutocompletePopperChildren(/* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteNoOptions, {
      className: classes.noOptions,
      ownerState,
      role: "presentation",
      onMouseDown: (event) => {
        event.preventDefault();
      },
      children: noOptionsText
    }));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteRoot, _extends({
      ref,
      className: clsx(classes.root, className),
      ownerState
    }, getRootProps(other), {
      children: renderInput({
        id,
        disabled,
        fullWidth: true,
        size: size === "small" ? "small" : void 0,
        InputLabelProps: getInputLabelProps(),
        InputProps: _extends({
          ref: setAnchorEl,
          className: classes.inputRoot,
          startAdornment,
          onClick: (event) => {
            if (event.target === event.currentTarget) {
              handleInputMouseDown(event);
            }
          }
        }, (hasClearIcon || hasPopupIcon) && {
          endAdornment: /* @__PURE__ */ jsxRuntimeExports.jsxs(AutocompleteEndAdornment, {
            className: classes.endAdornment,
            ownerState,
            children: [hasClearIcon ? /* @__PURE__ */ jsxRuntimeExports.jsx(AutocompleteClearIndicator, _extends({}, getClearProps(), {
              "aria-label": clearText,
              title: clearText,
              ownerState
            }, clearIndicatorSlotProps, {
              className: clsx(classes.clearIndicator, clearIndicatorSlotProps == null ? void 0 : clearIndicatorSlotProps.className),
              children: clearIcon
            })) : null, hasPopupIcon ? /* @__PURE__ */ jsxRuntimeExports.jsx(AutocompletePopupIndicator, _extends({}, getPopupIndicatorProps(), {
              disabled,
              "aria-label": popupOpen ? closeText : openText,
              title: popupOpen ? closeText : openText,
              ownerState
            }, popupIndicatorSlotProps, {
              className: clsx(classes.popupIndicator, popupIndicatorSlotProps == null ? void 0 : popupIndicatorSlotProps.className),
              children: popupIcon
            })) : null]
          })
        }),
        inputProps: _extends({
          className: classes.input,
          disabled,
          readOnly
        }, getInputProps())
      })
    })), anchorEl ? autocompletePopper : null]
  });
});
const Person$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
}), "Person");
function getAvatarUtilityClass(slot) {
  return generateUtilityClass$2("MuiAvatar", slot);
}
generateUtilityClasses("MuiAvatar", ["root", "colorDefault", "circular", "rounded", "square", "img", "fallback"]);
const _excluded$W = ["alt", "children", "className", "component", "slots", "slotProps", "imgProps", "sizes", "src", "srcSet", "variant"];
const useThemeProps$3 = createUseThemeProps();
const useUtilityClasses$S = (ownerState) => {
  const {
    classes,
    variant,
    colorDefault
  } = ownerState;
  const slots = {
    root: ["root", variant, colorDefault && "colorDefault"],
    img: ["img"],
    fallback: ["fallback"]
  };
  return composeClasses(slots, getAvatarUtilityClass, classes);
};
const AvatarRoot = styled("div", {
  name: "MuiAvatar",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], ownerState.colorDefault && styles2.colorDefault];
  }
})(({
  theme
}) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: 40,
  height: 40,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.pxToRem(20),
  lineHeight: 1,
  borderRadius: "50%",
  overflow: "hidden",
  userSelect: "none",
  variants: [{
    props: {
      variant: "rounded"
    },
    style: {
      borderRadius: (theme.vars || theme).shape.borderRadius
    }
  }, {
    props: {
      variant: "square"
    },
    style: {
      borderRadius: 0
    }
  }, {
    props: {
      colorDefault: true
    },
    style: _extends({
      color: (theme.vars || theme).palette.background.default
    }, theme.vars ? {
      backgroundColor: theme.vars.palette.Avatar.defaultBg
    } : _extends({
      backgroundColor: theme.palette.grey[400]
    }, theme.applyStyles("dark", {
      backgroundColor: theme.palette.grey[600]
    })))
  }]
}));
const AvatarImg = styled("img", {
  name: "MuiAvatar",
  slot: "Img",
  overridesResolver: (props, styles2) => styles2.img
})({
  width: "100%",
  height: "100%",
  textAlign: "center",
  // Handle non-square image. The property isn't supported by IE11.
  objectFit: "cover",
  // Hide alt text.
  color: "transparent",
  // Hide the image broken icon, only works on Chrome.
  textIndent: 1e4
});
const AvatarFallback = styled(Person$1, {
  name: "MuiAvatar",
  slot: "Fallback",
  overridesResolver: (props, styles2) => styles2.fallback
})({
  width: "75%",
  height: "75%"
});
function useLoaded({
  crossOrigin,
  referrerPolicy,
  src,
  srcSet
}) {
  const [loaded, setLoaded] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!src && !srcSet) {
      return void 0;
    }
    setLoaded(false);
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) {
        return;
      }
      setLoaded("loaded");
    };
    image.onerror = () => {
      if (!active) {
        return;
      }
      setLoaded("error");
    };
    image.crossOrigin = crossOrigin;
    image.referrerPolicy = referrerPolicy;
    image.src = src;
    if (srcSet) {
      image.srcset = srcSet;
    }
    return () => {
      active = false;
    };
  }, [crossOrigin, referrerPolicy, src, srcSet]);
  return loaded;
}
const Avatar = /* @__PURE__ */ reactExports.forwardRef(function Avatar2(inProps, ref) {
  const props = useThemeProps$3({
    props: inProps,
    name: "MuiAvatar"
  });
  const {
    alt,
    children: childrenProp,
    className,
    component = "div",
    slots = {},
    slotProps = {},
    imgProps,
    sizes,
    src,
    srcSet,
    variant = "circular"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$W);
  let children = null;
  const loaded = useLoaded(_extends({}, imgProps, {
    src,
    srcSet
  }));
  const hasImg = src || srcSet;
  const hasImgNotFailing = hasImg && loaded !== "error";
  const ownerState = _extends({}, props, {
    colorDefault: !hasImgNotFailing,
    component,
    variant
  });
  const classes = useUtilityClasses$S(ownerState);
  const [ImgSlot, imgSlotProps] = useSlot("img", {
    className: classes.img,
    elementType: AvatarImg,
    externalForwardedProps: {
      slots,
      slotProps: {
        img: _extends({}, imgProps, slotProps.img)
      }
    },
    additionalProps: {
      alt,
      src,
      srcSet,
      sizes
    },
    ownerState
  });
  if (hasImgNotFailing) {
    children = /* @__PURE__ */ jsxRuntimeExports.jsx(ImgSlot, _extends({}, imgSlotProps));
  } else if (!!childrenProp || childrenProp === 0) {
    children = childrenProp;
  } else if (hasImg && alt) {
    children = alt[0];
  } else {
    children = /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, {
      ownerState,
      className: classes.fallback
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarRoot, _extends({
    as: component,
    ownerState,
    className: clsx(classes.root, className),
    ref
  }, other, {
    children
  }));
});
function getBadgeUtilityClass(slot) {
  return generateUtilityClass$2("MuiBadge", slot);
}
const badgeClasses = generateUtilityClasses("MuiBadge", [
  "root",
  "badge",
  "dot",
  "standard",
  "anchorOriginTopRight",
  "anchorOriginBottomRight",
  "anchorOriginTopLeft",
  "anchorOriginBottomLeft",
  "invisible",
  "colorError",
  "colorInfo",
  "colorPrimary",
  "colorSecondary",
  "colorSuccess",
  "colorWarning",
  "overlapRectangular",
  "overlapCircular",
  // TODO: v6 remove the overlap value from these class keys
  "anchorOriginTopLeftCircular",
  "anchorOriginTopLeftRectangular",
  "anchorOriginTopRightCircular",
  "anchorOriginTopRightRectangular",
  "anchorOriginBottomLeftCircular",
  "anchorOriginBottomLeftRectangular",
  "anchorOriginBottomRightCircular",
  "anchorOriginBottomRightRectangular"
]);
const _excluded$V = ["anchorOrigin", "className", "classes", "component", "components", "componentsProps", "children", "overlap", "color", "invisible", "max", "badgeContent", "slots", "slotProps", "showZero", "variant"];
const RADIUS_STANDARD = 10;
const RADIUS_DOT = 4;
const useThemeProps$2 = createUseThemeProps();
const useUtilityClasses$R = (ownerState) => {
  const {
    color: color2,
    anchorOrigin,
    invisible,
    overlap,
    variant,
    classes = {}
  } = ownerState;
  const slots = {
    root: ["root"],
    badge: ["badge", variant, invisible && "invisible", `anchorOrigin${capitalize$1(anchorOrigin.vertical)}${capitalize$1(anchorOrigin.horizontal)}`, `anchorOrigin${capitalize$1(anchorOrigin.vertical)}${capitalize$1(anchorOrigin.horizontal)}${capitalize$1(overlap)}`, `overlap${capitalize$1(overlap)}`, color2 !== "default" && `color${capitalize$1(color2)}`]
  };
  return composeClasses(slots, getBadgeUtilityClass, classes);
};
const BadgeRoot = styled("span", {
  name: "MuiBadge",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  position: "relative",
  display: "inline-flex",
  // For correct alignment with the text.
  verticalAlign: "middle",
  flexShrink: 0
});
const BadgeBadge = styled("span", {
  name: "MuiBadge",
  slot: "Badge",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.badge, styles2[ownerState.variant], styles2[`anchorOrigin${capitalize$1(ownerState.anchorOrigin.vertical)}${capitalize$1(ownerState.anchorOrigin.horizontal)}${capitalize$1(ownerState.overlap)}`], ownerState.color !== "default" && styles2[`color${capitalize$1(ownerState.color)}`], ownerState.invisible && styles2.invisible];
  }
})(({
  theme
}) => {
  var _theme$vars;
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
    position: "absolute",
    boxSizing: "border-box",
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: theme.typography.pxToRem(12),
    minWidth: RADIUS_STANDARD * 2,
    lineHeight: 1,
    padding: "0 6px",
    height: RADIUS_STANDARD * 2,
    borderRadius: RADIUS_STANDARD,
    zIndex: 1,
    // Render the badge on top of potential ripples.
    transition: theme.transitions.create("transform", {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.enteringScreen
    }),
    variants: [...Object.keys(((_theme$vars = theme.vars) != null ? _theme$vars : theme).palette).filter((key) => {
      var _theme$vars2, _theme$vars3;
      return ((_theme$vars2 = theme.vars) != null ? _theme$vars2 : theme).palette[key].main && ((_theme$vars3 = theme.vars) != null ? _theme$vars3 : theme).palette[key].contrastText;
    }).map((color2) => ({
      props: {
        color: color2
      },
      style: {
        backgroundColor: (theme.vars || theme).palette[color2].main,
        color: (theme.vars || theme).palette[color2].contrastText
      }
    })), {
      props: {
        variant: "dot"
      },
      style: {
        borderRadius: RADIUS_DOT,
        height: RADIUS_DOT * 2,
        minWidth: RADIUS_DOT * 2,
        padding: 0
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "top" && ownerState.anchorOrigin.horizontal === "right" && ownerState.overlap === "rectangular",
      style: {
        top: 0,
        right: 0,
        transform: "scale(1) translate(50%, -50%)",
        transformOrigin: "100% 0%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(50%, -50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "bottom" && ownerState.anchorOrigin.horizontal === "right" && ownerState.overlap === "rectangular",
      style: {
        bottom: 0,
        right: 0,
        transform: "scale(1) translate(50%, 50%)",
        transformOrigin: "100% 100%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(50%, 50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "top" && ownerState.anchorOrigin.horizontal === "left" && ownerState.overlap === "rectangular",
      style: {
        top: 0,
        left: 0,
        transform: "scale(1) translate(-50%, -50%)",
        transformOrigin: "0% 0%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(-50%, -50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "bottom" && ownerState.anchorOrigin.horizontal === "left" && ownerState.overlap === "rectangular",
      style: {
        bottom: 0,
        left: 0,
        transform: "scale(1) translate(-50%, 50%)",
        transformOrigin: "0% 100%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(-50%, 50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "top" && ownerState.anchorOrigin.horizontal === "right" && ownerState.overlap === "circular",
      style: {
        top: "14%",
        right: "14%",
        transform: "scale(1) translate(50%, -50%)",
        transformOrigin: "100% 0%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(50%, -50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "bottom" && ownerState.anchorOrigin.horizontal === "right" && ownerState.overlap === "circular",
      style: {
        bottom: "14%",
        right: "14%",
        transform: "scale(1) translate(50%, 50%)",
        transformOrigin: "100% 100%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(50%, 50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "top" && ownerState.anchorOrigin.horizontal === "left" && ownerState.overlap === "circular",
      style: {
        top: "14%",
        left: "14%",
        transform: "scale(1) translate(-50%, -50%)",
        transformOrigin: "0% 0%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(-50%, -50%)"
        }
      }
    }, {
      props: ({
        ownerState
      }) => ownerState.anchorOrigin.vertical === "bottom" && ownerState.anchorOrigin.horizontal === "left" && ownerState.overlap === "circular",
      style: {
        bottom: "14%",
        left: "14%",
        transform: "scale(1) translate(-50%, 50%)",
        transformOrigin: "0% 100%",
        [`&.${badgeClasses.invisible}`]: {
          transform: "scale(0) translate(-50%, 50%)"
        }
      }
    }, {
      props: {
        invisible: true
      },
      style: {
        transition: theme.transitions.create("transform", {
          easing: theme.transitions.easing.easeInOut,
          duration: theme.transitions.duration.leavingScreen
        })
      }
    }]
  };
});
const Badge$1 = /* @__PURE__ */ reactExports.forwardRef(function Badge2(inProps, ref) {
  var _ref, _slots$root, _ref2, _slots$badge, _slotProps$root, _slotProps$badge;
  const props = useThemeProps$2({
    props: inProps,
    name: "MuiBadge"
  });
  const {
    anchorOrigin: anchorOriginProp = {
      vertical: "top",
      horizontal: "right"
    },
    className,
    component,
    components = {},
    componentsProps = {},
    children,
    overlap: overlapProp = "rectangular",
    color: colorProp = "default",
    invisible: invisibleProp = false,
    max: maxProp = 99,
    badgeContent: badgeContentProp,
    slots,
    slotProps,
    showZero = false,
    variant: variantProp = "standard"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$V);
  const {
    badgeContent,
    invisible: invisibleFromHook,
    max,
    displayValue: displayValueFromHook
  } = useBadge({
    max: maxProp,
    invisible: invisibleProp,
    badgeContent: badgeContentProp,
    showZero
  });
  const prevProps = usePreviousProps({
    anchorOrigin: anchorOriginProp,
    color: colorProp,
    overlap: overlapProp,
    variant: variantProp,
    badgeContent: badgeContentProp
  });
  const invisible = invisibleFromHook || badgeContent == null && variantProp !== "dot";
  const {
    color: color2 = colorProp,
    overlap = overlapProp,
    anchorOrigin = anchorOriginProp,
    variant = variantProp
  } = invisible ? prevProps : props;
  const displayValue = variant !== "dot" ? displayValueFromHook : void 0;
  const ownerState = _extends({}, props, {
    badgeContent,
    invisible,
    max,
    displayValue,
    showZero,
    anchorOrigin,
    color: color2,
    overlap,
    variant
  });
  const classes = useUtilityClasses$R(ownerState);
  const RootSlot = (_ref = (_slots$root = slots == null ? void 0 : slots.root) != null ? _slots$root : components.Root) != null ? _ref : BadgeRoot;
  const BadgeSlot = (_ref2 = (_slots$badge = slots == null ? void 0 : slots.badge) != null ? _slots$badge : components.Badge) != null ? _ref2 : BadgeBadge;
  const rootSlotProps = (_slotProps$root = slotProps == null ? void 0 : slotProps.root) != null ? _slotProps$root : componentsProps.root;
  const badgeSlotProps = (_slotProps$badge = slotProps == null ? void 0 : slotProps.badge) != null ? _slotProps$badge : componentsProps.badge;
  const rootProps = useSlotProps({
    elementType: RootSlot,
    externalSlotProps: rootSlotProps,
    externalForwardedProps: other,
    additionalProps: {
      ref,
      as: component
    },
    ownerState,
    className: clsx(rootSlotProps == null ? void 0 : rootSlotProps.className, classes.root, className)
  });
  const badgeProps = useSlotProps({
    elementType: BadgeSlot,
    externalSlotProps: badgeSlotProps,
    ownerState,
    className: clsx(classes.badge, badgeSlotProps == null ? void 0 : badgeSlotProps.className)
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(RootSlot, _extends({}, rootProps, {
    children: [children, /* @__PURE__ */ jsxRuntimeExports.jsx(BadgeSlot, _extends({}, badgeProps, {
      children: displayValue
    }))]
  }));
});
const boxClasses = generateUtilityClasses("MuiBox", ["root"]);
const defaultTheme = createTheme();
const Box = createBox({
  themeId: THEME_ID,
  defaultTheme,
  defaultClassName: boxClasses.root,
  generateClassName: ClassNameGenerator.generate
});
const MoreHorizIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
}), "MoreHoriz");
const _excluded$U = ["slots", "slotProps"];
const BreadcrumbCollapsedButton = styled(ButtonBase)(({
  theme
}) => _extends({
  display: "flex",
  marginLeft: `calc(${theme.spacing(1)} * 0.5)`,
  marginRight: `calc(${theme.spacing(1)} * 0.5)`
}, theme.palette.mode === "light" ? {
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.grey[700]
} : {
  backgroundColor: theme.palette.grey[700],
  color: theme.palette.grey[100]
}, {
  borderRadius: 2,
  "&:hover, &:focus": _extends({}, theme.palette.mode === "light" ? {
    backgroundColor: theme.palette.grey[200]
  } : {
    backgroundColor: theme.palette.grey[600]
  }),
  "&:active": _extends({
    boxShadow: theme.shadows[0]
  }, theme.palette.mode === "light" ? {
    backgroundColor: emphasize_1(theme.palette.grey[200], 0.12)
  } : {
    backgroundColor: emphasize_1(theme.palette.grey[600], 0.12)
  })
}));
const BreadcrumbCollapsedIcon = styled(MoreHorizIcon)({
  width: 24,
  height: 16
});
function BreadcrumbCollapsed(props) {
  const {
    slots = {},
    slotProps = {}
  } = props, otherProps = _objectWithoutPropertiesLoose(props, _excluded$U);
  const ownerState = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbCollapsedButton, _extends({
      focusRipple: true
    }, otherProps, {
      ownerState,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbCollapsedIcon, _extends({
        as: slots.CollapsedIcon,
        ownerState
      }, slotProps.collapsedIcon))
    }))
  });
}
function getBreadcrumbsUtilityClass(slot) {
  return generateUtilityClass$2("MuiBreadcrumbs", slot);
}
const breadcrumbsClasses = generateUtilityClasses("MuiBreadcrumbs", ["root", "ol", "li", "separator"]);
const _excluded$T = ["children", "className", "component", "slots", "slotProps", "expandText", "itemsAfterCollapse", "itemsBeforeCollapse", "maxItems", "separator"];
const useUtilityClasses$Q = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    li: ["li"],
    ol: ["ol"],
    separator: ["separator"]
  };
  return composeClasses(slots, getBreadcrumbsUtilityClass, classes);
};
const BreadcrumbsRoot = styled(Typography, {
  name: "MuiBreadcrumbs",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    return [{
      [`& .${breadcrumbsClasses.li}`]: styles2.li
    }, styles2.root];
  }
})({});
const BreadcrumbsOl = styled("ol", {
  name: "MuiBreadcrumbs",
  slot: "Ol",
  overridesResolver: (props, styles2) => styles2.ol
})({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  padding: 0,
  margin: 0,
  listStyle: "none"
});
const BreadcrumbsSeparator = styled("li", {
  name: "MuiBreadcrumbs",
  slot: "Separator",
  overridesResolver: (props, styles2) => styles2.separator
})({
  display: "flex",
  userSelect: "none",
  marginLeft: 8,
  marginRight: 8
});
function insertSeparators(items, className, separator, ownerState) {
  return items.reduce((acc, current, index) => {
    if (index < items.length - 1) {
      acc = acc.concat(current, /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbsSeparator, {
        "aria-hidden": true,
        className,
        ownerState,
        children: separator
      }, `separator-${index}`));
    } else {
      acc.push(current);
    }
    return acc;
  }, []);
}
const Breadcrumbs = /* @__PURE__ */ reactExports.forwardRef(function Breadcrumbs2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiBreadcrumbs"
  });
  const {
    children,
    className,
    component = "nav",
    slots = {},
    slotProps = {},
    expandText = "Show path",
    itemsAfterCollapse = 1,
    itemsBeforeCollapse = 1,
    maxItems = 8,
    separator = "/"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$T);
  const [expanded, setExpanded] = reactExports.useState(false);
  const ownerState = _extends({}, props, {
    component,
    expanded,
    expandText,
    itemsAfterCollapse,
    itemsBeforeCollapse,
    maxItems,
    separator
  });
  const classes = useUtilityClasses$Q(ownerState);
  const collapsedIconSlotProps = useSlotProps({
    elementType: slots.CollapsedIcon,
    externalSlotProps: slotProps.collapsedIcon,
    ownerState
  });
  const listRef = reactExports.useRef(null);
  const renderItemsBeforeAndAfter = (allItems2) => {
    const handleClickExpand = () => {
      setExpanded(true);
      const focusable = listRef.current.querySelector("a[href],button,[tabindex]");
      if (focusable) {
        focusable.focus();
      }
    };
    if (itemsBeforeCollapse + itemsAfterCollapse >= allItems2.length) {
      return allItems2;
    }
    return [...allItems2.slice(0, itemsBeforeCollapse), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbCollapsed, {
      "aria-label": expandText,
      slots: {
        CollapsedIcon: slots.CollapsedIcon
      },
      slotProps: {
        collapsedIcon: collapsedIconSlotProps
      },
      onClick: handleClickExpand
    }, "ellipsis"), ...allItems2.slice(allItems2.length - itemsAfterCollapse, allItems2.length)];
  };
  const allItems = reactExports.Children.toArray(children).filter((child) => {
    return /* @__PURE__ */ reactExports.isValidElement(child);
  }).map((child, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
    className: classes.li,
    children: child
  }, `child-${index}`));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbsRoot, _extends({
    ref,
    component,
    color: "text.secondary",
    className: clsx(classes.root, className),
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbsOl, {
      className: classes.ol,
      ref: listRef,
      ownerState,
      children: insertSeparators(expanded || maxItems && allItems.length <= maxItems ? allItems : renderItemsBeforeAndAfter(allItems), classes.separator, separator, ownerState)
    })
  }));
});
function getButtonGroupUtilityClass(slot) {
  return generateUtilityClass$2("MuiButtonGroup", slot);
}
const buttonGroupClasses = generateUtilityClasses("MuiButtonGroup", ["root", "contained", "outlined", "text", "disableElevation", "disabled", "firstButton", "fullWidth", "vertical", "grouped", "groupedHorizontal", "groupedVertical", "groupedText", "groupedTextHorizontal", "groupedTextVertical", "groupedTextPrimary", "groupedTextSecondary", "groupedOutlined", "groupedOutlinedHorizontal", "groupedOutlinedVertical", "groupedOutlinedPrimary", "groupedOutlinedSecondary", "groupedContained", "groupedContainedHorizontal", "groupedContainedVertical", "groupedContainedPrimary", "groupedContainedSecondary", "lastButton", "middleButton"]);
const _excluded$S = ["children", "className", "color", "component", "disabled", "disableElevation", "disableFocusRipple", "disableRipple", "fullWidth", "orientation", "size", "variant"];
const overridesResolver$1 = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [{
    [`& .${buttonGroupClasses.grouped}`]: styles2.grouped
  }, {
    [`& .${buttonGroupClasses.grouped}`]: styles2[`grouped${capitalize$1(ownerState.orientation)}`]
  }, {
    [`& .${buttonGroupClasses.grouped}`]: styles2[`grouped${capitalize$1(ownerState.variant)}`]
  }, {
    [`& .${buttonGroupClasses.grouped}`]: styles2[`grouped${capitalize$1(ownerState.variant)}${capitalize$1(ownerState.orientation)}`]
  }, {
    [`& .${buttonGroupClasses.grouped}`]: styles2[`grouped${capitalize$1(ownerState.variant)}${capitalize$1(ownerState.color)}`]
  }, {
    [`& .${buttonGroupClasses.firstButton}`]: styles2.firstButton
  }, {
    [`& .${buttonGroupClasses.lastButton}`]: styles2.lastButton
  }, {
    [`& .${buttonGroupClasses.middleButton}`]: styles2.middleButton
  }, styles2.root, styles2[ownerState.variant], ownerState.disableElevation === true && styles2.disableElevation, ownerState.fullWidth && styles2.fullWidth, ownerState.orientation === "vertical" && styles2.vertical];
};
const useUtilityClasses$P = (ownerState) => {
  const {
    classes,
    color: color2,
    disabled,
    disableElevation,
    fullWidth,
    orientation,
    variant
  } = ownerState;
  const slots = {
    root: ["root", variant, orientation === "vertical" && "vertical", fullWidth && "fullWidth", disableElevation && "disableElevation"],
    grouped: ["grouped", `grouped${capitalize$1(orientation)}`, `grouped${capitalize$1(variant)}`, `grouped${capitalize$1(variant)}${capitalize$1(orientation)}`, `grouped${capitalize$1(variant)}${capitalize$1(color2)}`, disabled && "disabled"],
    firstButton: ["firstButton"],
    lastButton: ["lastButton"],
    middleButton: ["middleButton"]
  };
  return composeClasses(slots, getButtonGroupUtilityClass, classes);
};
const ButtonGroupRoot = styled("div", {
  name: "MuiButtonGroup",
  slot: "Root",
  overridesResolver: overridesResolver$1
})(({
  theme,
  ownerState
}) => _extends({
  display: "inline-flex",
  borderRadius: (theme.vars || theme).shape.borderRadius
}, ownerState.variant === "contained" && {
  boxShadow: (theme.vars || theme).shadows[2]
}, ownerState.disableElevation && {
  boxShadow: "none"
}, ownerState.fullWidth && {
  width: "100%"
}, ownerState.orientation === "vertical" && {
  flexDirection: "column"
}, {
  [`& .${buttonGroupClasses.grouped}`]: _extends({
    minWidth: 40,
    "&:hover": _extends({}, ownerState.variant === "contained" && {
      boxShadow: "none"
    })
  }, ownerState.variant === "contained" && {
    boxShadow: "none"
  }),
  [`& .${buttonGroupClasses.firstButton},& .${buttonGroupClasses.middleButton}`]: _extends({}, ownerState.orientation === "horizontal" && {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  }, ownerState.orientation === "vertical" && {
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0
  }, ownerState.variant === "text" && ownerState.orientation === "horizontal" && {
    borderRight: theme.vars ? `1px solid rgba(${theme.vars.palette.common.onBackgroundChannel} / 0.23)` : `1px solid ${theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)"}`,
    [`&.${buttonGroupClasses.disabled}`]: {
      borderRight: `1px solid ${(theme.vars || theme).palette.action.disabled}`
    }
  }, ownerState.variant === "text" && ownerState.orientation === "vertical" && {
    borderBottom: theme.vars ? `1px solid rgba(${theme.vars.palette.common.onBackgroundChannel} / 0.23)` : `1px solid ${theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)"}`,
    [`&.${buttonGroupClasses.disabled}`]: {
      borderBottom: `1px solid ${(theme.vars || theme).palette.action.disabled}`
    }
  }, ownerState.variant === "text" && ownerState.color !== "inherit" && {
    borderColor: theme.vars ? `rgba(${theme.vars.palette[ownerState.color].mainChannel} / 0.5)` : alpha_1(theme.palette[ownerState.color].main, 0.5)
  }, ownerState.variant === "outlined" && ownerState.orientation === "horizontal" && {
    borderRightColor: "transparent"
  }, ownerState.variant === "outlined" && ownerState.orientation === "vertical" && {
    borderBottomColor: "transparent"
  }, ownerState.variant === "contained" && ownerState.orientation === "horizontal" && {
    borderRight: `1px solid ${(theme.vars || theme).palette.grey[400]}`,
    [`&.${buttonGroupClasses.disabled}`]: {
      borderRight: `1px solid ${(theme.vars || theme).palette.action.disabled}`
    }
  }, ownerState.variant === "contained" && ownerState.orientation === "vertical" && {
    borderBottom: `1px solid ${(theme.vars || theme).palette.grey[400]}`,
    [`&.${buttonGroupClasses.disabled}`]: {
      borderBottom: `1px solid ${(theme.vars || theme).palette.action.disabled}`
    }
  }, ownerState.variant === "contained" && ownerState.color !== "inherit" && {
    borderColor: (theme.vars || theme).palette[ownerState.color].dark
  }, {
    "&:hover": _extends({}, ownerState.variant === "outlined" && ownerState.orientation === "horizontal" && {
      borderRightColor: "currentColor"
    }, ownerState.variant === "outlined" && ownerState.orientation === "vertical" && {
      borderBottomColor: "currentColor"
    })
  }),
  [`& .${buttonGroupClasses.lastButton},& .${buttonGroupClasses.middleButton}`]: _extends({}, ownerState.orientation === "horizontal" && {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0
  }, ownerState.orientation === "vertical" && {
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0
  }, ownerState.variant === "outlined" && ownerState.orientation === "horizontal" && {
    marginLeft: -1
  }, ownerState.variant === "outlined" && ownerState.orientation === "vertical" && {
    marginTop: -1
  })
}));
const ButtonGroup = /* @__PURE__ */ reactExports.forwardRef(function ButtonGroup2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiButtonGroup"
  });
  const {
    children,
    className,
    color: color2 = "primary",
    component = "div",
    disabled = false,
    disableElevation = false,
    disableFocusRipple = false,
    disableRipple = false,
    fullWidth = false,
    orientation = "horizontal",
    size = "medium",
    variant = "outlined"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$S);
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    disabled,
    disableElevation,
    disableFocusRipple,
    disableRipple,
    fullWidth,
    orientation,
    size,
    variant
  });
  const classes = useUtilityClasses$P(ownerState);
  const context = reactExports.useMemo(() => ({
    className: classes.grouped,
    color: color2,
    disabled,
    disableElevation,
    disableFocusRipple,
    disableRipple,
    fullWidth,
    size,
    variant
  }), [color2, disabled, disableElevation, disableFocusRipple, disableRipple, fullWidth, size, variant, classes.grouped]);
  const validChildren = getValidReactChildren(children);
  const childrenCount = validChildren.length;
  const getButtonPositionClassName = (index) => {
    const isFirstButton = index === 0;
    const isLastButton = index === childrenCount - 1;
    if (isFirstButton && isLastButton) {
      return "";
    }
    if (isFirstButton) {
      return classes.firstButton;
    }
    if (isLastButton) {
      return classes.lastButton;
    }
    return classes.middleButton;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonGroupRoot, _extends({
    as: component,
    role: "group",
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonGroupContext.Provider, {
      value: context,
      children: validChildren.map((child, index) => {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonGroupButtonContext.Provider, {
          value: getButtonPositionClassName(index),
          children: child
        }, index);
      })
    })
  }));
});
function getCardUtilityClass(slot) {
  return generateUtilityClass$2("MuiCard", slot);
}
generateUtilityClasses("MuiCard", ["root"]);
const _excluded$R = ["className", "raised"];
const useUtilityClasses$O = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getCardUtilityClass, classes);
};
const CardRoot = styled(Paper, {
  name: "MuiCard",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(() => {
  return {
    overflow: "hidden"
  };
});
const Card = /* @__PURE__ */ reactExports.forwardRef(function Card2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCard"
  });
  const {
    className,
    raised = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$R);
  const ownerState = _extends({}, props, {
    raised
  });
  const classes = useUtilityClasses$O(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CardRoot, _extends({
    className: clsx(classes.root, className),
    elevation: raised ? 8 : void 0,
    ref,
    ownerState
  }, other));
});
function getCardActionAreaUtilityClass(slot) {
  return generateUtilityClass$2("MuiCardActionArea", slot);
}
const cardActionAreaClasses = generateUtilityClasses("MuiCardActionArea", ["root", "focusVisible", "focusHighlight"]);
const _excluded$Q = ["children", "className", "focusVisibleClassName"];
const useUtilityClasses$N = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    focusHighlight: ["focusHighlight"]
  };
  return composeClasses(slots, getCardActionAreaUtilityClass, classes);
};
const CardActionAreaRoot = styled(ButtonBase, {
  name: "MuiCardActionArea",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => ({
  display: "block",
  textAlign: "inherit",
  borderRadius: "inherit",
  // for Safari to work https://github.com/mui/material-ui/issues/36285.
  width: "100%",
  [`&:hover .${cardActionAreaClasses.focusHighlight}`]: {
    opacity: (theme.vars || theme).palette.action.hoverOpacity,
    "@media (hover: none)": {
      opacity: 0
    }
  },
  [`&.${cardActionAreaClasses.focusVisible} .${cardActionAreaClasses.focusHighlight}`]: {
    opacity: (theme.vars || theme).palette.action.focusOpacity
  }
}));
const CardActionAreaFocusHighlight = styled("span", {
  name: "MuiCardActionArea",
  slot: "FocusHighlight",
  overridesResolver: (props, styles2) => styles2.focusHighlight
})(({
  theme
}) => ({
  overflow: "hidden",
  pointerEvents: "none",
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: "inherit",
  opacity: 0,
  backgroundColor: "currentcolor",
  transition: theme.transitions.create("opacity", {
    duration: theme.transitions.duration.short
  })
}));
const CardActionArea = /* @__PURE__ */ reactExports.forwardRef(function CardActionArea2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCardActionArea"
  });
  const {
    children,
    className,
    focusVisibleClassName
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$Q);
  const ownerState = props;
  const classes = useUtilityClasses$N(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(CardActionAreaRoot, _extends({
    className: clsx(classes.root, className),
    focusVisibleClassName: clsx(focusVisibleClassName, classes.focusVisible),
    ref,
    ownerState
  }, other, {
    children: [children, /* @__PURE__ */ jsxRuntimeExports.jsx(CardActionAreaFocusHighlight, {
      className: classes.focusHighlight,
      ownerState
    })]
  }));
});
function getCardActionsUtilityClass(slot) {
  return generateUtilityClass$2("MuiCardActions", slot);
}
generateUtilityClasses("MuiCardActions", ["root", "spacing"]);
const _excluded$P = ["disableSpacing", "className"];
const useUtilityClasses$M = (ownerState) => {
  const {
    classes,
    disableSpacing
  } = ownerState;
  const slots = {
    root: ["root", !disableSpacing && "spacing"]
  };
  return composeClasses(slots, getCardActionsUtilityClass, classes);
};
const CardActionsRoot = styled("div", {
  name: "MuiCardActions",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, !ownerState.disableSpacing && styles2.spacing];
  }
})(({
  ownerState
}) => _extends({
  display: "flex",
  alignItems: "center",
  padding: 8
}, !ownerState.disableSpacing && {
  "& > :not(style) ~ :not(style)": {
    marginLeft: 8
  }
}));
const CardActions = /* @__PURE__ */ reactExports.forwardRef(function CardActions2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCardActions"
  });
  const {
    disableSpacing = false,
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$P);
  const ownerState = _extends({}, props, {
    disableSpacing
  });
  const classes = useUtilityClasses$M(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CardActionsRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getCardContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiCardContent", slot);
}
generateUtilityClasses("MuiCardContent", ["root"]);
const _excluded$O = ["className", "component"];
const useUtilityClasses$L = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getCardContentUtilityClass, classes);
};
const CardContentRoot = styled("div", {
  name: "MuiCardContent",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(() => {
  return {
    padding: 16,
    "&:last-child": {
      paddingBottom: 24
    }
  };
});
const CardContent = /* @__PURE__ */ reactExports.forwardRef(function CardContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCardContent"
  });
  const {
    className,
    component = "div"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$O);
  const ownerState = _extends({}, props, {
    component
  });
  const classes = useUtilityClasses$L(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CardContentRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getSwitchBaseUtilityClass(slot) {
  return generateUtilityClass$2("PrivateSwitchBase", slot);
}
generateUtilityClasses("PrivateSwitchBase", ["root", "checked", "disabled", "input", "edgeStart", "edgeEnd"]);
const _excluded$N = ["autoFocus", "checked", "checkedIcon", "className", "defaultChecked", "disabled", "disableFocusRipple", "edge", "icon", "id", "inputProps", "inputRef", "name", "onBlur", "onChange", "onFocus", "readOnly", "required", "tabIndex", "type", "value"];
const useUtilityClasses$K = (ownerState) => {
  const {
    classes,
    checked,
    disabled,
    edge
  } = ownerState;
  const slots = {
    root: ["root", checked && "checked", disabled && "disabled", edge && `edge${capitalize$1(edge)}`],
    input: ["input"]
  };
  return composeClasses(slots, getSwitchBaseUtilityClass, classes);
};
const SwitchBaseRoot = styled(ButtonBase)(({
  ownerState
}) => _extends({
  padding: 9,
  borderRadius: "50%"
}, ownerState.edge === "start" && {
  marginLeft: ownerState.size === "small" ? -3 : -12
}, ownerState.edge === "end" && {
  marginRight: ownerState.size === "small" ? -3 : -12
}));
const SwitchBaseInput = styled("input", {
  shouldForwardProp: rootShouldForwardProp
})({
  cursor: "inherit",
  position: "absolute",
  opacity: 0,
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  margin: 0,
  padding: 0,
  zIndex: 1
});
const SwitchBase = /* @__PURE__ */ reactExports.forwardRef(function SwitchBase2(props, ref) {
  const {
    autoFocus,
    checked: checkedProp,
    checkedIcon,
    className,
    defaultChecked,
    disabled: disabledProp,
    disableFocusRipple = false,
    edge = false,
    icon,
    id,
    inputProps,
    inputRef,
    name,
    onBlur,
    onChange,
    onFocus,
    readOnly,
    required = false,
    tabIndex,
    type,
    value
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$N);
  const [checked, setCheckedState] = useControlled({
    controlled: checkedProp,
    default: Boolean(defaultChecked),
    name: "SwitchBase",
    state: "checked"
  });
  const muiFormControl = useFormControl();
  const handleFocus = (event) => {
    if (onFocus) {
      onFocus(event);
    }
    if (muiFormControl && muiFormControl.onFocus) {
      muiFormControl.onFocus(event);
    }
  };
  const handleBlur = (event) => {
    if (onBlur) {
      onBlur(event);
    }
    if (muiFormControl && muiFormControl.onBlur) {
      muiFormControl.onBlur(event);
    }
  };
  const handleInputChange = (event) => {
    if (event.nativeEvent.defaultPrevented) {
      return;
    }
    const newChecked = event.target.checked;
    setCheckedState(newChecked);
    if (onChange) {
      onChange(event, newChecked);
    }
  };
  let disabled = disabledProp;
  if (muiFormControl) {
    if (typeof disabled === "undefined") {
      disabled = muiFormControl.disabled;
    }
  }
  const hasLabelFor = type === "checkbox" || type === "radio";
  const ownerState = _extends({}, props, {
    checked,
    disabled,
    disableFocusRipple,
    edge
  });
  const classes = useUtilityClasses$K(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SwitchBaseRoot, _extends({
    component: "span",
    className: clsx(classes.root, className),
    centerRipple: true,
    focusRipple: !disableFocusRipple,
    disabled,
    tabIndex: null,
    role: void 0,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ownerState,
    ref
  }, other, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SwitchBaseInput, _extends({
      autoFocus,
      checked: checkedProp,
      defaultChecked,
      className: classes.input,
      disabled,
      id: hasLabelFor ? id : void 0,
      name,
      onChange: handleInputChange,
      readOnly,
      ref: inputRef,
      required,
      ownerState,
      tabIndex,
      type
    }, type === "checkbox" && value === void 0 ? {} : {
      value
    }, inputProps)), checked ? checkedIcon : icon]
  }));
});
const CheckBoxOutlineBlankIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
}), "CheckBoxOutlineBlank");
const CheckBoxIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
}), "CheckBox");
const IndeterminateCheckBoxIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"
}), "IndeterminateCheckBox");
function getCheckboxUtilityClass(slot) {
  return generateUtilityClass$2("MuiCheckbox", slot);
}
const checkboxClasses = generateUtilityClasses("MuiCheckbox", ["root", "checked", "disabled", "indeterminate", "colorPrimary", "colorSecondary", "sizeSmall", "sizeMedium"]);
const _excluded$M = ["checkedIcon", "color", "icon", "indeterminate", "indeterminateIcon", "inputProps", "size", "className"];
const useUtilityClasses$J = (ownerState) => {
  const {
    classes,
    indeterminate,
    color: color2,
    size
  } = ownerState;
  const slots = {
    root: ["root", indeterminate && "indeterminate", `color${capitalize$1(color2)}`, `size${capitalize$1(size)}`]
  };
  const composedClasses = composeClasses(slots, getCheckboxUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const CheckboxRoot = styled(SwitchBase, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiCheckbox",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.indeterminate && styles2.indeterminate, styles2[`size${capitalize$1(ownerState.size)}`], ownerState.color !== "default" && styles2[`color${capitalize$1(ownerState.color)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  color: (theme.vars || theme).palette.text.secondary
}, !ownerState.disableRipple && {
  "&:hover": {
    backgroundColor: theme.vars ? `rgba(${ownerState.color === "default" ? theme.vars.palette.action.activeChannel : theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(ownerState.color === "default" ? theme.palette.action.active : theme.palette[ownerState.color].main, theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  }
}, ownerState.color !== "default" && {
  [`&.${checkboxClasses.checked}, &.${checkboxClasses.indeterminate}`]: {
    color: (theme.vars || theme).palette[ownerState.color].main
  },
  [`&.${checkboxClasses.disabled}`]: {
    color: (theme.vars || theme).palette.action.disabled
  }
}));
const defaultCheckedIcon$1 = /* @__PURE__ */ jsxRuntimeExports.jsx(CheckBoxIcon, {});
const defaultIcon$2 = /* @__PURE__ */ jsxRuntimeExports.jsx(CheckBoxOutlineBlankIcon, {});
const defaultIndeterminateIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(IndeterminateCheckBoxIcon, {});
const Checkbox = /* @__PURE__ */ reactExports.forwardRef(function Checkbox2(inProps, ref) {
  var _icon$props$fontSize, _indeterminateIcon$pr;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCheckbox"
  });
  const {
    checkedIcon = defaultCheckedIcon$1,
    color: color2 = "primary",
    icon: iconProp = defaultIcon$2,
    indeterminate = false,
    indeterminateIcon: indeterminateIconProp = defaultIndeterminateIcon,
    inputProps,
    size = "medium",
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$M);
  const icon = indeterminate ? indeterminateIconProp : iconProp;
  const indeterminateIcon = indeterminate ? indeterminateIconProp : checkedIcon;
  const ownerState = _extends({}, props, {
    color: color2,
    indeterminate,
    size
  });
  const classes = useUtilityClasses$J(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CheckboxRoot, _extends({
    type: "checkbox",
    inputProps: _extends({
      "data-indeterminate": indeterminate
    }, inputProps),
    icon: /* @__PURE__ */ reactExports.cloneElement(icon, {
      fontSize: (_icon$props$fontSize = icon.props.fontSize) != null ? _icon$props$fontSize : size
    }),
    checkedIcon: /* @__PURE__ */ reactExports.cloneElement(indeterminateIcon, {
      fontSize: (_indeterminateIcon$pr = indeterminateIcon.props.fontSize) != null ? _indeterminateIcon$pr : size
    }),
    ownerState,
    ref,
    className: clsx(classes.root, className)
  }, other, {
    classes
  }));
});
function getCircularProgressUtilityClass(slot) {
  return generateUtilityClass$2("MuiCircularProgress", slot);
}
generateUtilityClasses("MuiCircularProgress", ["root", "determinate", "indeterminate", "colorPrimary", "colorSecondary", "svg", "circle", "circleDeterminate", "circleIndeterminate", "circleDisableShrink"]);
const _excluded$L = ["className", "color", "disableShrink", "size", "style", "thickness", "value", "variant"];
let _$1 = (t2) => t2, _t$1, _t2$1, _t3$1, _t4$1;
const SIZE = 44;
const circularRotateKeyframe = keyframes(_t$1 || (_t$1 = _$1`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`));
const circularDashKeyframe = keyframes(_t2$1 || (_t2$1 = _$1`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -125px;
  }
`));
const useUtilityClasses$I = (ownerState) => {
  const {
    classes,
    variant,
    color: color2,
    disableShrink
  } = ownerState;
  const slots = {
    root: ["root", variant, `color${capitalize$1(color2)}`],
    svg: ["svg"],
    circle: ["circle", `circle${capitalize$1(variant)}`, disableShrink && "circleDisableShrink"]
  };
  return composeClasses(slots, getCircularProgressUtilityClass, classes);
};
const CircularProgressRoot = styled("span", {
  name: "MuiCircularProgress",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], styles2[`color${capitalize$1(ownerState.color)}`]];
  }
})(({
  ownerState,
  theme
}) => _extends({
  display: "inline-block"
}, ownerState.variant === "determinate" && {
  transition: theme.transitions.create("transform")
}, ownerState.color !== "inherit" && {
  color: (theme.vars || theme).palette[ownerState.color].main
}), ({
  ownerState
}) => ownerState.variant === "indeterminate" && css(_t3$1 || (_t3$1 = _$1`
      animation: ${0} 1.4s linear infinite;
    `), circularRotateKeyframe));
const CircularProgressSVG = styled("svg", {
  name: "MuiCircularProgress",
  slot: "Svg",
  overridesResolver: (props, styles2) => styles2.svg
})({
  display: "block"
  // Keeps the progress centered
});
const CircularProgressCircle = styled("circle", {
  name: "MuiCircularProgress",
  slot: "Circle",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.circle, styles2[`circle${capitalize$1(ownerState.variant)}`], ownerState.disableShrink && styles2.circleDisableShrink];
  }
})(({
  ownerState,
  theme
}) => _extends({
  stroke: "currentColor"
}, ownerState.variant === "determinate" && {
  transition: theme.transitions.create("stroke-dashoffset")
}, ownerState.variant === "indeterminate" && {
  // Some default value that looks fine waiting for the animation to kicks in.
  strokeDasharray: "80px, 200px",
  strokeDashoffset: 0
  // Add the unit to fix a Edge 16 and below bug.
}), ({
  ownerState
}) => ownerState.variant === "indeterminate" && !ownerState.disableShrink && css(_t4$1 || (_t4$1 = _$1`
      animation: ${0} 1.4s ease-in-out infinite;
    `), circularDashKeyframe));
const CircularProgress = /* @__PURE__ */ reactExports.forwardRef(function CircularProgress2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiCircularProgress"
  });
  const {
    className,
    color: color2 = "primary",
    disableShrink = false,
    size = 40,
    style: style2,
    thickness = 3.6,
    value = 0,
    variant = "indeterminate"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$L);
  const ownerState = _extends({}, props, {
    color: color2,
    disableShrink,
    size,
    thickness,
    value,
    variant
  });
  const classes = useUtilityClasses$I(ownerState);
  const circleStyle = {};
  const rootStyle = {};
  const rootProps = {};
  if (variant === "determinate") {
    const circumference = 2 * Math.PI * ((SIZE - thickness) / 2);
    circleStyle.strokeDasharray = circumference.toFixed(3);
    rootProps["aria-valuenow"] = Math.round(value);
    circleStyle.strokeDashoffset = `${((100 - value) / 100 * circumference).toFixed(3)}px`;
    rootStyle.transform = "rotate(-90deg)";
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CircularProgressRoot, _extends({
    className: clsx(classes.root, className),
    style: _extends({
      width: size,
      height: size
    }, rootStyle, style2),
    ownerState,
    ref,
    role: "progressbar"
  }, rootProps, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircularProgressSVG, {
      className: classes.svg,
      ownerState,
      viewBox: `${SIZE / 2} ${SIZE / 2} ${SIZE} ${SIZE}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircularProgressCircle, {
        className: classes.circle,
        style: circleStyle,
        ownerState,
        cx: SIZE,
        cy: SIZE,
        r: (SIZE - thickness) / 2,
        fill: "none",
        strokeWidth: thickness
      })
    })
  }));
});
function getDialogContentTextUtilityClass(slot) {
  return generateUtilityClass$2("MuiDialogContentText", slot);
}
generateUtilityClasses("MuiDialogContentText", ["root"]);
const _excluded$K = ["children", "className"];
const useUtilityClasses$H = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  const composedClasses = composeClasses(slots, getDialogContentTextUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const DialogContentTextRoot = styled(Typography, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiDialogContentText",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({});
const DialogContentText = /* @__PURE__ */ reactExports.forwardRef(function DialogContentText2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDialogContentText"
  });
  const {
    className
  } = props, ownerState = _objectWithoutPropertiesLoose(props, _excluded$K);
  const classes = useUtilityClasses$H(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentTextRoot, _extends({
    component: "p",
    variant: "body1",
    color: "text.secondary",
    ref,
    ownerState,
    className: clsx(classes.root, className)
  }, props, {
    classes
  }));
});
const _excluded$J = ["className", "id"];
const useUtilityClasses$G = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getDialogTitleUtilityClass, classes);
};
const DialogTitleRoot = styled(Typography, {
  name: "MuiDialogTitle",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  padding: "16px 24px",
  flex: "0 0 auto"
});
const DialogTitle = /* @__PURE__ */ reactExports.forwardRef(function DialogTitle2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDialogTitle"
  });
  const {
    className,
    id: idProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$J);
  const ownerState = props;
  const classes = useUtilityClasses$G(ownerState);
  const {
    titleId = idProp
  } = reactExports.useContext(DialogContext);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitleRoot, _extends({
    component: "h2",
    className: clsx(classes.root, className),
    ownerState,
    ref,
    variant: "h6",
    id: idProp != null ? idProp : titleId
  }, other));
});
const _excluded$I = ["addEndListener", "appear", "children", "container", "direction", "easing", "in", "onEnter", "onEntered", "onEntering", "onExit", "onExited", "onExiting", "style", "timeout", "TransitionComponent"];
function getTranslateValue(direction, node, resolvedContainer) {
  const rect = node.getBoundingClientRect();
  const containerRect = resolvedContainer && resolvedContainer.getBoundingClientRect();
  const containerWindow = ownerWindow(node);
  let transform;
  if (node.fakeTransform) {
    transform = node.fakeTransform;
  } else {
    const computedStyle = containerWindow.getComputedStyle(node);
    transform = computedStyle.getPropertyValue("-webkit-transform") || computedStyle.getPropertyValue("transform");
  }
  let offsetX = 0;
  let offsetY = 0;
  if (transform && transform !== "none" && typeof transform === "string") {
    const transformValues = transform.split("(")[1].split(")")[0].split(",");
    offsetX = parseInt(transformValues[4], 10);
    offsetY = parseInt(transformValues[5], 10);
  }
  if (direction === "left") {
    if (containerRect) {
      return `translateX(${containerRect.right + offsetX - rect.left}px)`;
    }
    return `translateX(${containerWindow.innerWidth + offsetX - rect.left}px)`;
  }
  if (direction === "right") {
    if (containerRect) {
      return `translateX(-${rect.right - containerRect.left - offsetX}px)`;
    }
    return `translateX(-${rect.left + rect.width - offsetX}px)`;
  }
  if (direction === "up") {
    if (containerRect) {
      return `translateY(${containerRect.bottom + offsetY - rect.top}px)`;
    }
    return `translateY(${containerWindow.innerHeight + offsetY - rect.top}px)`;
  }
  if (containerRect) {
    return `translateY(-${rect.top - containerRect.top + rect.height - offsetY}px)`;
  }
  return `translateY(-${rect.top + rect.height - offsetY}px)`;
}
function resolveContainer(containerPropProp) {
  return typeof containerPropProp === "function" ? containerPropProp() : containerPropProp;
}
function setTranslateValue(direction, node, containerProp) {
  const resolvedContainer = resolveContainer(containerProp);
  const transform = getTranslateValue(direction, node, resolvedContainer);
  if (transform) {
    node.style.webkitTransform = transform;
    node.style.transform = transform;
  }
}
const Slide = /* @__PURE__ */ reactExports.forwardRef(function Slide2(props, ref) {
  const theme = useTheme$1();
  const defaultEasing = {
    enter: theme.transitions.easing.easeOut,
    exit: theme.transitions.easing.sharp
  };
  const defaultTimeout = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    addEndListener,
    appear = true,
    children,
    container: containerProp,
    direction = "down",
    easing: easingProp = defaultEasing,
    in: inProp,
    onEnter,
    onEntered,
    onEntering,
    onExit,
    onExited,
    onExiting,
    style: style2,
    timeout = defaultTimeout,
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Transition
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$I);
  const childrenRef = reactExports.useRef(null);
  const handleRef = useForkRef(children.ref, childrenRef, ref);
  const normalizedTransitionCallback = (callback) => (isAppearing) => {
    if (callback) {
      if (isAppearing === void 0) {
        callback(childrenRef.current);
      } else {
        callback(childrenRef.current, isAppearing);
      }
    }
  };
  const handleEnter = normalizedTransitionCallback((node, isAppearing) => {
    setTranslateValue(direction, node, containerProp);
    reflow(node);
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  });
  const handleEntering = normalizedTransitionCallback((node, isAppearing) => {
    const transitionProps = getTransitionProps({
      timeout,
      style: style2,
      easing: easingProp
    }, {
      mode: "enter"
    });
    node.style.webkitTransition = theme.transitions.create("-webkit-transform", _extends({}, transitionProps));
    node.style.transition = theme.transitions.create("transform", _extends({}, transitionProps));
    node.style.webkitTransform = "none";
    node.style.transform = "none";
    if (onEntering) {
      onEntering(node, isAppearing);
    }
  });
  const handleEntered = normalizedTransitionCallback(onEntered);
  const handleExiting = normalizedTransitionCallback(onExiting);
  const handleExit = normalizedTransitionCallback((node) => {
    const transitionProps = getTransitionProps({
      timeout,
      style: style2,
      easing: easingProp
    }, {
      mode: "exit"
    });
    node.style.webkitTransition = theme.transitions.create("-webkit-transform", transitionProps);
    node.style.transition = theme.transitions.create("transform", transitionProps);
    setTranslateValue(direction, node, containerProp);
    if (onExit) {
      onExit(node);
    }
  });
  const handleExited = normalizedTransitionCallback((node) => {
    node.style.webkitTransition = "";
    node.style.transition = "";
    if (onExited) {
      onExited(node);
    }
  });
  const handleAddEndListener = (next2) => {
    if (addEndListener) {
      addEndListener(childrenRef.current, next2);
    }
  };
  const updatePosition = reactExports.useCallback(() => {
    if (childrenRef.current) {
      setTranslateValue(direction, childrenRef.current, containerProp);
    }
  }, [direction, containerProp]);
  reactExports.useEffect(() => {
    if (inProp || direction === "down" || direction === "right") {
      return void 0;
    }
    const handleResize = debounce(() => {
      if (childrenRef.current) {
        setTranslateValue(direction, childrenRef.current, containerProp);
      }
    });
    const containerWindow = ownerWindow(childrenRef.current);
    containerWindow.addEventListener("resize", handleResize);
    return () => {
      handleResize.clear();
      containerWindow.removeEventListener("resize", handleResize);
    };
  }, [direction, inProp, containerProp]);
  reactExports.useEffect(() => {
    if (!inProp) {
      updatePosition();
    }
  }, [inProp, updatePosition]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    nodeRef: childrenRef,
    onEnter: handleEnter,
    onEntered: handleEntered,
    onEntering: handleEntering,
    onExit: handleExit,
    onExited: handleExited,
    onExiting: handleExiting,
    addEndListener: handleAddEndListener,
    appear,
    in: inProp,
    timeout
  }, other, {
    children: (state, childProps) => {
      return /* @__PURE__ */ reactExports.cloneElement(children, _extends({
        ref: handleRef,
        style: _extends({
          visibility: state === "exited" && !inProp ? "hidden" : void 0
        }, style2, children.props.style)
      }, childProps));
    }
  }));
});
function getDrawerUtilityClass(slot) {
  return generateUtilityClass$2("MuiDrawer", slot);
}
generateUtilityClasses("MuiDrawer", ["root", "docked", "paper", "paperAnchorLeft", "paperAnchorRight", "paperAnchorTop", "paperAnchorBottom", "paperAnchorDockedLeft", "paperAnchorDockedRight", "paperAnchorDockedTop", "paperAnchorDockedBottom", "modal"]);
const _excluded$H = ["BackdropProps"], _excluded2$4 = ["anchor", "BackdropProps", "children", "className", "elevation", "hideBackdrop", "ModalProps", "onClose", "open", "PaperProps", "SlideProps", "TransitionComponent", "transitionDuration", "variant"];
const overridesResolver = (props, styles2) => {
  const {
    ownerState
  } = props;
  return [styles2.root, (ownerState.variant === "permanent" || ownerState.variant === "persistent") && styles2.docked, styles2.modal];
};
const useUtilityClasses$F = (ownerState) => {
  const {
    classes,
    anchor,
    variant
  } = ownerState;
  const slots = {
    root: ["root"],
    docked: [(variant === "permanent" || variant === "persistent") && "docked"],
    modal: ["modal"],
    paper: ["paper", `paperAnchor${capitalize$1(anchor)}`, variant !== "temporary" && `paperAnchorDocked${capitalize$1(anchor)}`]
  };
  return composeClasses(slots, getDrawerUtilityClass, classes);
};
const DrawerRoot = styled(Modal, {
  name: "MuiDrawer",
  slot: "Root",
  overridesResolver
})(({
  theme
}) => ({
  zIndex: (theme.vars || theme).zIndex.drawer
}));
const DrawerDockedRoot = styled("div", {
  shouldForwardProp: rootShouldForwardProp,
  name: "MuiDrawer",
  slot: "Docked",
  skipVariantsResolver: false,
  overridesResolver
})({
  flex: "0 0 auto"
});
const DrawerPaper = styled(Paper, {
  name: "MuiDrawer",
  slot: "Paper",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.paper, styles2[`paperAnchor${capitalize$1(ownerState.anchor)}`], ownerState.variant !== "temporary" && styles2[`paperAnchorDocked${capitalize$1(ownerState.anchor)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  flex: "1 0 auto",
  zIndex: (theme.vars || theme).zIndex.drawer,
  // Add iOS momentum scrolling for iOS < 13.0
  WebkitOverflowScrolling: "touch",
  // temporary style
  position: "fixed",
  top: 0,
  // We disable the focus ring for mouse, touch and keyboard users.
  // At some point, it would be better to keep it for keyboard users.
  // :focus-ring CSS pseudo-class will help.
  outline: 0
}, ownerState.anchor === "left" && {
  left: 0
}, ownerState.anchor === "top" && {
  top: 0,
  left: 0,
  right: 0,
  height: "auto",
  maxHeight: "100%"
}, ownerState.anchor === "right" && {
  right: 0
}, ownerState.anchor === "bottom" && {
  top: "auto",
  left: 0,
  bottom: 0,
  right: 0,
  height: "auto",
  maxHeight: "100%"
}, ownerState.anchor === "left" && ownerState.variant !== "temporary" && {
  borderRight: `1px solid ${(theme.vars || theme).palette.divider}`
}, ownerState.anchor === "top" && ownerState.variant !== "temporary" && {
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`
}, ownerState.anchor === "right" && ownerState.variant !== "temporary" && {
  borderLeft: `1px solid ${(theme.vars || theme).palette.divider}`
}, ownerState.anchor === "bottom" && ownerState.variant !== "temporary" && {
  borderTop: `1px solid ${(theme.vars || theme).palette.divider}`
}));
const oppositeDirection = {
  left: "right",
  right: "left",
  top: "down",
  bottom: "up"
};
function isHorizontal(anchor) {
  return ["left", "right"].indexOf(anchor) !== -1;
}
function getAnchor({
  direction
}, anchor) {
  return direction === "rtl" && isHorizontal(anchor) ? oppositeDirection[anchor] : anchor;
}
const Drawer = /* @__PURE__ */ reactExports.forwardRef(function Drawer2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiDrawer"
  });
  const theme = useTheme$1();
  const isRtl = useRtl();
  const defaultTransitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    anchor: anchorProp = "left",
    BackdropProps,
    children,
    className,
    elevation = 16,
    hideBackdrop = false,
    ModalProps: {
      BackdropProps: BackdropPropsProp
    } = {},
    onClose,
    open = false,
    PaperProps = {},
    SlideProps,
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Slide,
    transitionDuration = defaultTransitionDuration,
    variant = "temporary"
  } = props, ModalProps = _objectWithoutPropertiesLoose(props.ModalProps, _excluded$H), other = _objectWithoutPropertiesLoose(props, _excluded2$4);
  const mounted = reactExports.useRef(false);
  reactExports.useEffect(() => {
    mounted.current = true;
  }, []);
  const anchorInvariant = getAnchor({
    direction: isRtl ? "rtl" : "ltr"
  }, anchorProp);
  const anchor = anchorProp;
  const ownerState = _extends({}, props, {
    anchor,
    elevation,
    open,
    variant
  }, other);
  const classes = useUtilityClasses$F(ownerState);
  const drawer = /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerPaper, _extends({
    elevation: variant === "temporary" ? elevation : 0,
    square: true
  }, PaperProps, {
    className: clsx(classes.paper, PaperProps.className),
    ownerState,
    children
  }));
  if (variant === "permanent") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerDockedRoot, _extends({
      className: clsx(classes.root, classes.docked, className),
      ownerState,
      ref
    }, other, {
      children: drawer
    }));
  }
  const slidingDrawer = /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    in: open,
    direction: oppositeDirection[anchorInvariant],
    timeout: transitionDuration,
    appear: mounted.current
  }, SlideProps, {
    children: drawer
  }));
  if (variant === "persistent") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerDockedRoot, _extends({
      className: clsx(classes.root, classes.docked, className),
      ownerState,
      ref
    }, other, {
      children: slidingDrawer
    }));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrawerRoot, _extends({
    BackdropProps: _extends({}, BackdropProps, BackdropPropsProp, {
      transitionDuration
    }),
    className: clsx(classes.root, classes.modal, className),
    open,
    ownerState,
    onClose,
    hideBackdrop,
    ref
  }, other, ModalProps, {
    children: slidingDrawer
  }));
});
function getFabUtilityClass(slot) {
  return generateUtilityClass$2("MuiFab", slot);
}
const fabClasses = generateUtilityClasses("MuiFab", ["root", "primary", "secondary", "extended", "circular", "focusVisible", "disabled", "colorInherit", "sizeSmall", "sizeMedium", "sizeLarge", "info", "error", "warning", "success"]);
const _excluded$G = ["children", "className", "color", "component", "disabled", "disableFocusRipple", "focusVisibleClassName", "size", "variant"];
const useUtilityClasses$E = (ownerState) => {
  const {
    color: color2,
    variant,
    classes,
    size
  } = ownerState;
  const slots = {
    root: ["root", variant, `size${capitalize$1(size)}`, color2 === "inherit" ? "colorInherit" : color2]
  };
  const composedClasses = composeClasses(slots, getFabUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const FabRoot = styled(ButtonBase, {
  name: "MuiFab",
  slot: "Root",
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], styles2[`size${capitalize$1(ownerState.size)}`], ownerState.color === "inherit" && styles2.colorInherit, styles2[capitalize$1(ownerState.size)], styles2[ownerState.color]];
  }
})(({
  theme,
  ownerState
}) => {
  var _theme$palette$getCon, _theme$palette;
  return _extends({}, theme.typography.button, {
    minHeight: 36,
    transition: theme.transitions.create(["background-color", "box-shadow", "border-color"], {
      duration: theme.transitions.duration.short
    }),
    borderRadius: "50%",
    padding: 0,
    minWidth: 0,
    width: 56,
    height: 56,
    zIndex: (theme.vars || theme).zIndex.fab,
    boxShadow: (theme.vars || theme).shadows[6],
    "&:active": {
      boxShadow: (theme.vars || theme).shadows[12]
    },
    color: theme.vars ? theme.vars.palette.text.primary : (_theme$palette$getCon = (_theme$palette = theme.palette).getContrastText) == null ? void 0 : _theme$palette$getCon.call(_theme$palette, theme.palette.grey[300]),
    backgroundColor: (theme.vars || theme).palette.grey[300],
    "&:hover": {
      backgroundColor: (theme.vars || theme).palette.grey.A100,
      // Reset on touch devices, it doesn't add specificity
      "@media (hover: none)": {
        backgroundColor: (theme.vars || theme).palette.grey[300]
      },
      textDecoration: "none"
    },
    [`&.${fabClasses.focusVisible}`]: {
      boxShadow: (theme.vars || theme).shadows[6]
    }
  }, ownerState.size === "small" && {
    width: 40,
    height: 40
  }, ownerState.size === "medium" && {
    width: 48,
    height: 48
  }, ownerState.variant === "extended" && {
    borderRadius: 48 / 2,
    padding: "0 16px",
    width: "auto",
    minHeight: "auto",
    minWidth: 48,
    height: 48
  }, ownerState.variant === "extended" && ownerState.size === "small" && {
    width: "auto",
    padding: "0 8px",
    borderRadius: 34 / 2,
    minWidth: 34,
    height: 34
  }, ownerState.variant === "extended" && ownerState.size === "medium" && {
    width: "auto",
    padding: "0 16px",
    borderRadius: 40 / 2,
    minWidth: 40,
    height: 40
  }, ownerState.color === "inherit" && {
    color: "inherit"
  });
}, ({
  theme,
  ownerState
}) => _extends({}, ownerState.color !== "inherit" && ownerState.color !== "default" && (theme.vars || theme).palette[ownerState.color] != null && {
  color: (theme.vars || theme).palette[ownerState.color].contrastText,
  backgroundColor: (theme.vars || theme).palette[ownerState.color].main,
  "&:hover": {
    backgroundColor: (theme.vars || theme).palette[ownerState.color].dark,
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: (theme.vars || theme).palette[ownerState.color].main
    }
  }
}), ({
  theme
}) => ({
  [`&.${fabClasses.disabled}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    boxShadow: (theme.vars || theme).shadows[0],
    backgroundColor: (theme.vars || theme).palette.action.disabledBackground
  }
}));
const Fab = /* @__PURE__ */ reactExports.forwardRef(function Fab2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFab"
  });
  const {
    children,
    className,
    color: color2 = "default",
    component = "button",
    disabled = false,
    disableFocusRipple = false,
    focusVisibleClassName,
    size = "large",
    variant = "circular"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$G);
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    disabled,
    disableFocusRipple,
    size,
    variant
  });
  const classes = useUtilityClasses$E(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FabRoot, _extends({
    className: clsx(classes.root, className),
    component,
    disabled,
    focusRipple: !disableFocusRipple,
    focusVisibleClassName: clsx(classes.focusVisible, focusVisibleClassName),
    ownerState,
    ref
  }, other, {
    classes,
    children
  }));
});
const Stack = createStack({
  createStyledComponent: styled("div", {
    name: "MuiStack",
    slot: "Root",
    overridesResolver: (props, styles2) => styles2.root
  }),
  useThemeProps: (inProps) => useThemeProps$a({
    props: inProps,
    name: "MuiStack"
  })
});
function getFormControlLabelUtilityClasses(slot) {
  return generateUtilityClass$2("MuiFormControlLabel", slot);
}
const formControlLabelClasses = generateUtilityClasses("MuiFormControlLabel", ["root", "labelPlacementStart", "labelPlacementTop", "labelPlacementBottom", "disabled", "label", "error", "required", "asterisk"]);
const _excluded$F = ["checked", "className", "componentsProps", "control", "disabled", "disableTypography", "inputRef", "label", "labelPlacement", "name", "onChange", "required", "slotProps", "value"];
const useUtilityClasses$D = (ownerState) => {
  const {
    classes,
    disabled,
    labelPlacement,
    error,
    required
  } = ownerState;
  const slots = {
    root: ["root", disabled && "disabled", `labelPlacement${capitalize$1(labelPlacement)}`, error && "error", required && "required"],
    label: ["label", disabled && "disabled"],
    asterisk: ["asterisk", error && "error"]
  };
  return composeClasses(slots, getFormControlLabelUtilityClasses, classes);
};
const FormControlLabelRoot = styled("label", {
  name: "MuiFormControlLabel",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${formControlLabelClasses.label}`]: styles2.label
    }, styles2.root, styles2[`labelPlacement${capitalize$1(ownerState.labelPlacement)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  // For correct alignment with the text.
  verticalAlign: "middle",
  WebkitTapHighlightColor: "transparent",
  marginLeft: -11,
  marginRight: 16,
  // used for row presentation of radio/checkbox
  [`&.${formControlLabelClasses.disabled}`]: {
    cursor: "default"
  }
}, ownerState.labelPlacement === "start" && {
  flexDirection: "row-reverse",
  marginLeft: 16,
  // used for row presentation of radio/checkbox
  marginRight: -11
}, ownerState.labelPlacement === "top" && {
  flexDirection: "column-reverse",
  marginLeft: 16
}, ownerState.labelPlacement === "bottom" && {
  flexDirection: "column",
  marginLeft: 16
}, {
  [`& .${formControlLabelClasses.label}`]: {
    [`&.${formControlLabelClasses.disabled}`]: {
      color: (theme.vars || theme).palette.text.disabled
    }
  }
}));
const AsteriskComponent = styled("span", {
  name: "MuiFormControlLabel",
  slot: "Asterisk",
  overridesResolver: (props, styles2) => styles2.asterisk
})(({
  theme
}) => ({
  [`&.${formControlLabelClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}));
const FormControlLabel = /* @__PURE__ */ reactExports.forwardRef(function FormControlLabel2(inProps, ref) {
  var _ref, _slotProps$typography;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFormControlLabel"
  });
  const {
    className,
    componentsProps = {},
    control,
    disabled: disabledProp,
    disableTypography,
    label: labelProp,
    labelPlacement = "end",
    required: requiredProp,
    slotProps = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$F);
  const muiFormControl = useFormControl();
  const disabled = (_ref = disabledProp != null ? disabledProp : control.props.disabled) != null ? _ref : muiFormControl == null ? void 0 : muiFormControl.disabled;
  const required = requiredProp != null ? requiredProp : control.props.required;
  const controlProps = {
    disabled,
    required
  };
  ["checked", "name", "onChange", "value", "inputRef"].forEach((key) => {
    if (typeof control.props[key] === "undefined" && typeof props[key] !== "undefined") {
      controlProps[key] = props[key];
    }
  });
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["error"]
  });
  const ownerState = _extends({}, props, {
    disabled,
    labelPlacement,
    required,
    error: fcs.error
  });
  const classes = useUtilityClasses$D(ownerState);
  const typographySlotProps = (_slotProps$typography = slotProps.typography) != null ? _slotProps$typography : componentsProps.typography;
  let label = labelProp;
  if (label != null && label.type !== Typography && !disableTypography) {
    label = /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, _extends({
      component: "span"
    }, typographySlotProps, {
      className: clsx(classes.label, typographySlotProps == null ? void 0 : typographySlotProps.className),
      children: label
    }));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControlLabelRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other, {
    children: [/* @__PURE__ */ reactExports.cloneElement(control, controlProps), required ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, {
      display: "block",
      children: [label, /* @__PURE__ */ jsxRuntimeExports.jsxs(AsteriskComponent, {
        ownerState,
        "aria-hidden": true,
        className: classes.asterisk,
        children: [" ", "*"]
      })]
    }) : label]
  }));
});
function getFormGroupUtilityClass(slot) {
  return generateUtilityClass$2("MuiFormGroup", slot);
}
generateUtilityClasses("MuiFormGroup", ["root", "row", "error"]);
const _excluded$E = ["className", "row"];
const useUtilityClasses$C = (ownerState) => {
  const {
    classes,
    row,
    error
  } = ownerState;
  const slots = {
    root: ["root", row && "row", error && "error"]
  };
  return composeClasses(slots, getFormGroupUtilityClass, classes);
};
const FormGroupRoot = styled("div", {
  name: "MuiFormGroup",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.row && styles2.row];
  }
})(({
  ownerState
}) => _extends({
  display: "flex",
  flexDirection: "column",
  flexWrap: "wrap"
}, ownerState.row && {
  flexDirection: "row"
}));
const FormGroup = /* @__PURE__ */ reactExports.forwardRef(function FormGroup2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiFormGroup"
  });
  const {
    className,
    row = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$E);
  const muiFormControl = useFormControl();
  const fcs = formControlState({
    props,
    muiFormControl,
    states: ["error"]
  });
  const ownerState = _extends({}, props, {
    row,
    error: fcs.error
  });
  const classes = useUtilityClasses$C(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormGroupRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
const GridContext = /* @__PURE__ */ reactExports.createContext();
function getGridUtilityClass(slot) {
  return generateUtilityClass$2("MuiGrid", slot);
}
const SPACINGS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DIRECTIONS = ["column-reverse", "column", "row-reverse", "row"];
const WRAPS = ["nowrap", "wrap-reverse", "wrap"];
const GRID_SIZES = ["auto", true, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const gridClasses = generateUtilityClasses("MuiGrid", [
  "root",
  "container",
  "item",
  "zeroMinWidth",
  // spacings
  ...SPACINGS.map((spacing) => `spacing-xs-${spacing}`),
  // direction values
  ...DIRECTIONS.map((direction) => `direction-xs-${direction}`),
  // wrap values
  ...WRAPS.map((wrap) => `wrap-xs-${wrap}`),
  // grid sizes for all breakpoints
  ...GRID_SIZES.map((size) => `grid-xs-${size}`),
  ...GRID_SIZES.map((size) => `grid-sm-${size}`),
  ...GRID_SIZES.map((size) => `grid-md-${size}`),
  ...GRID_SIZES.map((size) => `grid-lg-${size}`),
  ...GRID_SIZES.map((size) => `grid-xl-${size}`)
]);
const _excluded$D = ["className", "columns", "columnSpacing", "component", "container", "direction", "item", "rowSpacing", "spacing", "wrap", "zeroMinWidth"];
function getOffset(val) {
  const parse = parseFloat(val);
  return `${parse}${String(val).replace(String(parse), "") || "px"}`;
}
function generateGrid({
  theme,
  ownerState
}) {
  let size;
  return theme.breakpoints.keys.reduce((globalStyles, breakpoint) => {
    let styles2 = {};
    if (ownerState[breakpoint]) {
      size = ownerState[breakpoint];
    }
    if (!size) {
      return globalStyles;
    }
    if (size === true) {
      styles2 = {
        flexBasis: 0,
        flexGrow: 1,
        maxWidth: "100%"
      };
    } else if (size === "auto") {
      styles2 = {
        flexBasis: "auto",
        flexGrow: 0,
        flexShrink: 0,
        maxWidth: "none",
        width: "auto"
      };
    } else {
      const columnsBreakpointValues = resolveBreakpointValues({
        values: ownerState.columns,
        breakpoints: theme.breakpoints.values
      });
      const columnValue = typeof columnsBreakpointValues === "object" ? columnsBreakpointValues[breakpoint] : columnsBreakpointValues;
      if (columnValue === void 0 || columnValue === null) {
        return globalStyles;
      }
      const width2 = `${Math.round(size / columnValue * 1e8) / 1e6}%`;
      let more = {};
      if (ownerState.container && ownerState.item && ownerState.columnSpacing !== 0) {
        const themeSpacing = theme.spacing(ownerState.columnSpacing);
        if (themeSpacing !== "0px") {
          const fullWidth = `calc(${width2} + ${getOffset(themeSpacing)})`;
          more = {
            flexBasis: fullWidth,
            maxWidth: fullWidth
          };
        }
      }
      styles2 = _extends({
        flexBasis: width2,
        flexGrow: 0,
        maxWidth: width2
      }, more);
    }
    if (theme.breakpoints.values[breakpoint] === 0) {
      Object.assign(globalStyles, styles2);
    } else {
      globalStyles[theme.breakpoints.up(breakpoint)] = styles2;
    }
    return globalStyles;
  }, {});
}
function generateDirection({
  theme,
  ownerState
}) {
  const directionValues = resolveBreakpointValues({
    values: ownerState.direction,
    breakpoints: theme.breakpoints.values
  });
  return handleBreakpoints({
    theme
  }, directionValues, (propValue) => {
    const output = {
      flexDirection: propValue
    };
    if (propValue.indexOf("column") === 0) {
      output[`& > .${gridClasses.item}`] = {
        maxWidth: "none"
      };
    }
    return output;
  });
}
function extractZeroValueBreakpointKeys({
  breakpoints,
  values: values2
}) {
  let nonZeroKey = "";
  Object.keys(values2).forEach((key) => {
    if (nonZeroKey !== "") {
      return;
    }
    if (values2[key] !== 0) {
      nonZeroKey = key;
    }
  });
  const sortedBreakpointKeysByValue = Object.keys(breakpoints).sort((a, b2) => {
    return breakpoints[a] - breakpoints[b2];
  });
  return sortedBreakpointKeysByValue.slice(0, sortedBreakpointKeysByValue.indexOf(nonZeroKey));
}
function generateRowGap({
  theme,
  ownerState
}) {
  const {
    container,
    rowSpacing
  } = ownerState;
  let styles2 = {};
  if (container && rowSpacing !== 0) {
    const rowSpacingValues = resolveBreakpointValues({
      values: rowSpacing,
      breakpoints: theme.breakpoints.values
    });
    let zeroValueBreakpointKeys;
    if (typeof rowSpacingValues === "object") {
      zeroValueBreakpointKeys = extractZeroValueBreakpointKeys({
        breakpoints: theme.breakpoints.values,
        values: rowSpacingValues
      });
    }
    styles2 = handleBreakpoints({
      theme
    }, rowSpacingValues, (propValue, breakpoint) => {
      var _zeroValueBreakpointK;
      const themeSpacing = theme.spacing(propValue);
      if (themeSpacing !== "0px") {
        return {
          marginTop: `-${getOffset(themeSpacing)}`,
          [`& > .${gridClasses.item}`]: {
            paddingTop: getOffset(themeSpacing)
          }
        };
      }
      if ((_zeroValueBreakpointK = zeroValueBreakpointKeys) != null && _zeroValueBreakpointK.includes(breakpoint)) {
        return {};
      }
      return {
        marginTop: 0,
        [`& > .${gridClasses.item}`]: {
          paddingTop: 0
        }
      };
    });
  }
  return styles2;
}
function generateColumnGap({
  theme,
  ownerState
}) {
  const {
    container,
    columnSpacing
  } = ownerState;
  let styles2 = {};
  if (container && columnSpacing !== 0) {
    const columnSpacingValues = resolveBreakpointValues({
      values: columnSpacing,
      breakpoints: theme.breakpoints.values
    });
    let zeroValueBreakpointKeys;
    if (typeof columnSpacingValues === "object") {
      zeroValueBreakpointKeys = extractZeroValueBreakpointKeys({
        breakpoints: theme.breakpoints.values,
        values: columnSpacingValues
      });
    }
    styles2 = handleBreakpoints({
      theme
    }, columnSpacingValues, (propValue, breakpoint) => {
      var _zeroValueBreakpointK2;
      const themeSpacing = theme.spacing(propValue);
      if (themeSpacing !== "0px") {
        return {
          width: `calc(100% + ${getOffset(themeSpacing)})`,
          marginLeft: `-${getOffset(themeSpacing)}`,
          [`& > .${gridClasses.item}`]: {
            paddingLeft: getOffset(themeSpacing)
          }
        };
      }
      if ((_zeroValueBreakpointK2 = zeroValueBreakpointKeys) != null && _zeroValueBreakpointK2.includes(breakpoint)) {
        return {};
      }
      return {
        width: "100%",
        marginLeft: 0,
        [`& > .${gridClasses.item}`]: {
          paddingLeft: 0
        }
      };
    });
  }
  return styles2;
}
function resolveSpacingStyles(spacing, breakpoints, styles2 = {}) {
  if (!spacing || spacing <= 0) {
    return [];
  }
  if (typeof spacing === "string" && !Number.isNaN(Number(spacing)) || typeof spacing === "number") {
    return [styles2[`spacing-xs-${String(spacing)}`]];
  }
  const spacingStyles = [];
  breakpoints.forEach((breakpoint) => {
    const value = spacing[breakpoint];
    if (Number(value) > 0) {
      spacingStyles.push(styles2[`spacing-${breakpoint}-${String(value)}`]);
    }
  });
  return spacingStyles;
}
const GridRoot = styled("div", {
  name: "MuiGrid",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    const {
      container,
      direction,
      item,
      spacing,
      wrap,
      zeroMinWidth,
      breakpoints
    } = ownerState;
    let spacingStyles = [];
    if (container) {
      spacingStyles = resolveSpacingStyles(spacing, breakpoints, styles2);
    }
    const breakpointsStyles = [];
    breakpoints.forEach((breakpoint) => {
      const value = ownerState[breakpoint];
      if (value) {
        breakpointsStyles.push(styles2[`grid-${breakpoint}-${String(value)}`]);
      }
    });
    return [styles2.root, container && styles2.container, item && styles2.item, zeroMinWidth && styles2.zeroMinWidth, ...spacingStyles, direction !== "row" && styles2[`direction-xs-${String(direction)}`], wrap !== "wrap" && styles2[`wrap-xs-${String(wrap)}`], ...breakpointsStyles];
  }
})(({
  ownerState
}) => _extends({
  boxSizing: "border-box"
}, ownerState.container && {
  display: "flex",
  flexWrap: "wrap",
  width: "100%"
}, ownerState.item && {
  margin: 0
  // For instance, it's useful when used with a `figure` element.
}, ownerState.zeroMinWidth && {
  minWidth: 0
}, ownerState.wrap !== "wrap" && {
  flexWrap: ownerState.wrap
}), generateDirection, generateRowGap, generateColumnGap, generateGrid);
function resolveSpacingClasses(spacing, breakpoints) {
  if (!spacing || spacing <= 0) {
    return [];
  }
  if (typeof spacing === "string" && !Number.isNaN(Number(spacing)) || typeof spacing === "number") {
    return [`spacing-xs-${String(spacing)}`];
  }
  const classes = [];
  breakpoints.forEach((breakpoint) => {
    const value = spacing[breakpoint];
    if (Number(value) > 0) {
      const className = `spacing-${breakpoint}-${String(value)}`;
      classes.push(className);
    }
  });
  return classes;
}
const useUtilityClasses$B = (ownerState) => {
  const {
    classes,
    container,
    direction,
    item,
    spacing,
    wrap,
    zeroMinWidth,
    breakpoints
  } = ownerState;
  let spacingClasses = [];
  if (container) {
    spacingClasses = resolveSpacingClasses(spacing, breakpoints);
  }
  const breakpointsClasses = [];
  breakpoints.forEach((breakpoint) => {
    const value = ownerState[breakpoint];
    if (value) {
      breakpointsClasses.push(`grid-${breakpoint}-${String(value)}`);
    }
  });
  const slots = {
    root: ["root", container && "container", item && "item", zeroMinWidth && "zeroMinWidth", ...spacingClasses, direction !== "row" && `direction-xs-${String(direction)}`, wrap !== "wrap" && `wrap-xs-${String(wrap)}`, ...breakpointsClasses]
  };
  return composeClasses(slots, getGridUtilityClass, classes);
};
const Grid = /* @__PURE__ */ reactExports.forwardRef(function Grid2(inProps, ref) {
  const themeProps = useThemeProps$a({
    props: inProps,
    name: "MuiGrid"
  });
  const {
    breakpoints
  } = useTheme$1();
  const props = extendSxProp(themeProps);
  const {
    className,
    columns: columnsProp,
    columnSpacing: columnSpacingProp,
    component = "div",
    container = false,
    direction = "row",
    item = false,
    rowSpacing: rowSpacingProp,
    spacing = 0,
    wrap = "wrap",
    zeroMinWidth = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$D);
  const rowSpacing = rowSpacingProp || spacing;
  const columnSpacing = columnSpacingProp || spacing;
  const columnsContext = reactExports.useContext(GridContext);
  const columns = container ? columnsProp || 12 : columnsContext;
  const breakpointsValues = {};
  const otherFiltered = _extends({}, other);
  breakpoints.keys.forEach((breakpoint) => {
    if (other[breakpoint] != null) {
      breakpointsValues[breakpoint] = other[breakpoint];
      delete otherFiltered[breakpoint];
    }
  });
  const ownerState = _extends({}, props, {
    columns,
    container,
    direction,
    item,
    rowSpacing,
    columnSpacing,
    wrap,
    zeroMinWidth,
    spacing
  }, breakpointsValues, {
    breakpoints: breakpoints.keys
  });
  const classes = useUtilityClasses$B(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(GridContext.Provider, {
    value: columns,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(GridRoot, _extends({
      ownerState,
      className: clsx(classes.root, className),
      as: component,
      ref
    }, otherFiltered))
  });
});
function getLinearProgressUtilityClass(slot) {
  return generateUtilityClass$2("MuiLinearProgress", slot);
}
generateUtilityClasses("MuiLinearProgress", ["root", "colorPrimary", "colorSecondary", "determinate", "indeterminate", "buffer", "query", "dashed", "dashedColorPrimary", "dashedColorSecondary", "bar", "barColorPrimary", "barColorSecondary", "bar1Indeterminate", "bar1Determinate", "bar1Buffer", "bar2Indeterminate", "bar2Buffer"]);
const _excluded$C = ["className", "color", "value", "valueBuffer", "variant"];
let _ = (t2) => t2, _t, _t2, _t3, _t4, _t5, _t6;
const TRANSITION_DURATION = 4;
const indeterminate1Keyframe = keyframes(_t || (_t = _`
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
`));
const indeterminate2Keyframe = keyframes(_t2 || (_t2 = _`
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
`));
const bufferKeyframe = keyframes(_t3 || (_t3 = _`
  0% {
    opacity: 1;
    background-position: 0 -23px;
  }

  60% {
    opacity: 0;
    background-position: 0 -23px;
  }

  100% {
    opacity: 1;
    background-position: -200px -23px;
  }
`));
const useUtilityClasses$A = (ownerState) => {
  const {
    classes,
    variant,
    color: color2
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2)}`, variant],
    dashed: ["dashed", `dashedColor${capitalize$1(color2)}`],
    bar1: ["bar", `barColor${capitalize$1(color2)}`, (variant === "indeterminate" || variant === "query") && "bar1Indeterminate", variant === "determinate" && "bar1Determinate", variant === "buffer" && "bar1Buffer"],
    bar2: ["bar", variant !== "buffer" && `barColor${capitalize$1(color2)}`, variant === "buffer" && `color${capitalize$1(color2)}`, (variant === "indeterminate" || variant === "query") && "bar2Indeterminate", variant === "buffer" && "bar2Buffer"]
  };
  return composeClasses(slots, getLinearProgressUtilityClass, classes);
};
const getColorShade = (theme, color2) => {
  if (color2 === "inherit") {
    return "currentColor";
  }
  if (theme.vars) {
    return theme.vars.palette.LinearProgress[`${color2}Bg`];
  }
  return theme.palette.mode === "light" ? lighten_1(theme.palette[color2].main, 0.62) : darken_1(theme.palette[color2].main, 0.5);
};
const LinearProgressRoot = styled("span", {
  name: "MuiLinearProgress",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`color${capitalize$1(ownerState.color)}`], styles2[ownerState.variant]];
  }
})(({
  ownerState,
  theme
}) => _extends({
  position: "relative",
  overflow: "hidden",
  display: "block",
  height: 4,
  zIndex: 0,
  // Fix Safari's bug during composition of different paint.
  "@media print": {
    colorAdjust: "exact"
  },
  backgroundColor: getColorShade(theme, ownerState.color)
}, ownerState.color === "inherit" && ownerState.variant !== "buffer" && {
  backgroundColor: "none",
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "currentColor",
    opacity: 0.3
  }
}, ownerState.variant === "buffer" && {
  backgroundColor: "transparent"
}, ownerState.variant === "query" && {
  transform: "rotate(180deg)"
}));
const LinearProgressDashed = styled("span", {
  name: "MuiLinearProgress",
  slot: "Dashed",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.dashed, styles2[`dashedColor${capitalize$1(ownerState.color)}`]];
  }
})(({
  ownerState,
  theme
}) => {
  const backgroundColor2 = getColorShade(theme, ownerState.color);
  return _extends({
    position: "absolute",
    marginTop: 0,
    height: "100%",
    width: "100%"
  }, ownerState.color === "inherit" && {
    opacity: 0.3
  }, {
    backgroundImage: `radial-gradient(${backgroundColor2} 0%, ${backgroundColor2} 16%, transparent 42%)`,
    backgroundSize: "10px 10px",
    backgroundPosition: "0 -23px"
  });
}, css(_t4 || (_t4 = _`
    animation: ${0} 3s infinite linear;
  `), bufferKeyframe));
const LinearProgressBar1 = styled("span", {
  name: "MuiLinearProgress",
  slot: "Bar1",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.bar, styles2[`barColor${capitalize$1(ownerState.color)}`], (ownerState.variant === "indeterminate" || ownerState.variant === "query") && styles2.bar1Indeterminate, ownerState.variant === "determinate" && styles2.bar1Determinate, ownerState.variant === "buffer" && styles2.bar1Buffer];
  }
})(({
  ownerState,
  theme
}) => _extends({
  width: "100%",
  position: "absolute",
  left: 0,
  bottom: 0,
  top: 0,
  transition: "transform 0.2s linear",
  transformOrigin: "left",
  backgroundColor: ownerState.color === "inherit" ? "currentColor" : (theme.vars || theme).palette[ownerState.color].main
}, ownerState.variant === "determinate" && {
  transition: `transform .${TRANSITION_DURATION}s linear`
}, ownerState.variant === "buffer" && {
  zIndex: 1,
  transition: `transform .${TRANSITION_DURATION}s linear`
}), ({
  ownerState
}) => (ownerState.variant === "indeterminate" || ownerState.variant === "query") && css(_t5 || (_t5 = _`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    `), indeterminate1Keyframe));
const LinearProgressBar2 = styled("span", {
  name: "MuiLinearProgress",
  slot: "Bar2",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.bar, styles2[`barColor${capitalize$1(ownerState.color)}`], (ownerState.variant === "indeterminate" || ownerState.variant === "query") && styles2.bar2Indeterminate, ownerState.variant === "buffer" && styles2.bar2Buffer];
  }
})(({
  ownerState,
  theme
}) => _extends({
  width: "100%",
  position: "absolute",
  left: 0,
  bottom: 0,
  top: 0,
  transition: "transform 0.2s linear",
  transformOrigin: "left"
}, ownerState.variant !== "buffer" && {
  backgroundColor: ownerState.color === "inherit" ? "currentColor" : (theme.vars || theme).palette[ownerState.color].main
}, ownerState.color === "inherit" && {
  opacity: 0.3
}, ownerState.variant === "buffer" && {
  backgroundColor: getColorShade(theme, ownerState.color),
  transition: `transform .${TRANSITION_DURATION}s linear`
}), ({
  ownerState
}) => (ownerState.variant === "indeterminate" || ownerState.variant === "query") && css(_t6 || (_t6 = _`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
    `), indeterminate2Keyframe));
const LinearProgress = /* @__PURE__ */ reactExports.forwardRef(function LinearProgress2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiLinearProgress"
  });
  const {
    className,
    color: color2 = "primary",
    value,
    valueBuffer,
    variant = "indeterminate"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$C);
  const ownerState = _extends({}, props, {
    color: color2,
    variant
  });
  const classes = useUtilityClasses$A(ownerState);
  const isRtl = useRtl();
  const rootProps = {};
  const inlineStyles = {
    bar1: {},
    bar2: {}
  };
  if (variant === "determinate" || variant === "buffer") {
    if (value !== void 0) {
      rootProps["aria-valuenow"] = Math.round(value);
      rootProps["aria-valuemin"] = 0;
      rootProps["aria-valuemax"] = 100;
      let transform = value - 100;
      if (isRtl) {
        transform = -transform;
      }
      inlineStyles.bar1.transform = `translateX(${transform}%)`;
    }
  }
  if (variant === "buffer") {
    if (valueBuffer !== void 0) {
      let transform = (valueBuffer || 0) - 100;
      if (isRtl) {
        transform = -transform;
      }
      inlineStyles.bar2.transform = `translateX(${transform}%)`;
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(LinearProgressRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    role: "progressbar"
  }, rootProps, {
    ref
  }, other, {
    children: [variant === "buffer" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgressDashed, {
      className: classes.dashed,
      ownerState
    }) : null, /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgressBar1, {
      className: classes.bar1,
      ownerState,
      style: inlineStyles.bar1
    }), variant === "determinate" ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgressBar2, {
      className: classes.bar2,
      ownerState,
      style: inlineStyles.bar2
    })]
  }));
});
function getLinkUtilityClass(slot) {
  return generateUtilityClass$2("MuiLink", slot);
}
const linkClasses = generateUtilityClasses("MuiLink", ["root", "underlineNone", "underlineHover", "underlineAlways", "button", "focusVisible"]);
const colorTransformations = {
  primary: "primary.main",
  textPrimary: "text.primary",
  secondary: "secondary.main",
  textSecondary: "text.secondary",
  error: "error.main"
};
const transformDeprecatedColors = (color2) => {
  return colorTransformations[color2] || color2;
};
const getTextDecoration = ({
  theme,
  ownerState
}) => {
  const transformedColor = transformDeprecatedColors(ownerState.color);
  const color2 = getPath(theme, `palette.${transformedColor}`, false) || ownerState.color;
  const channelColor = getPath(theme, `palette.${transformedColor}Channel`);
  if ("vars" in theme && channelColor) {
    return `rgba(${channelColor} / 0.4)`;
  }
  return alpha_1(color2, 0.4);
};
const _excluded$B = ["className", "color", "component", "onBlur", "onFocus", "TypographyClasses", "underline", "variant", "sx"];
const useUtilityClasses$z = (ownerState) => {
  const {
    classes,
    component,
    focusVisible,
    underline
  } = ownerState;
  const slots = {
    root: ["root", `underline${capitalize$1(underline)}`, component === "button" && "button", focusVisible && "focusVisible"]
  };
  return composeClasses(slots, getLinkUtilityClass, classes);
};
const LinkRoot = styled(Typography, {
  name: "MuiLink",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`underline${capitalize$1(ownerState.underline)}`], ownerState.component === "button" && styles2.button];
  }
})(({
  theme,
  ownerState
}) => {
  return _extends({}, ownerState.underline === "none" && {
    textDecoration: "none"
  }, ownerState.underline === "hover" && {
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline"
    }
  }, ownerState.underline === "always" && _extends({
    textDecoration: "underline"
  }, ownerState.color !== "inherit" && {
    textDecorationColor: getTextDecoration({
      theme,
      ownerState
    })
  }, {
    "&:hover": {
      textDecorationColor: "inherit"
    }
  }), ownerState.component === "button" && {
    position: "relative",
    WebkitTapHighlightColor: "transparent",
    backgroundColor: "transparent",
    // Reset default value
    // We disable the focus ring for mouse, touch and keyboard users.
    outline: 0,
    border: 0,
    margin: 0,
    // Remove the margin in Safari
    borderRadius: 0,
    padding: 0,
    // Remove the padding in Firefox
    cursor: "pointer",
    userSelect: "none",
    verticalAlign: "middle",
    MozAppearance: "none",
    // Reset
    WebkitAppearance: "none",
    // Reset
    "&::-moz-focus-inner": {
      borderStyle: "none"
      // Remove Firefox dotted outline.
    },
    [`&.${linkClasses.focusVisible}`]: {
      outline: "auto"
    }
  });
});
const Link = /* @__PURE__ */ reactExports.forwardRef(function Link2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiLink"
  });
  const {
    className,
    color: color2 = "primary",
    component = "a",
    onBlur,
    onFocus,
    TypographyClasses,
    underline = "always",
    variant = "inherit",
    sx
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$B);
  const {
    isFocusVisibleRef,
    onBlur: handleBlurVisible,
    onFocus: handleFocusVisible,
    ref: focusVisibleRef
  } = useIsFocusVisible();
  const [focusVisible, setFocusVisible] = reactExports.useState(false);
  const handlerRef = useForkRef(ref, focusVisibleRef);
  const handleBlur = (event) => {
    handleBlurVisible(event);
    if (isFocusVisibleRef.current === false) {
      setFocusVisible(false);
    }
    if (onBlur) {
      onBlur(event);
    }
  };
  const handleFocus = (event) => {
    handleFocusVisible(event);
    if (isFocusVisibleRef.current === true) {
      setFocusVisible(true);
    }
    if (onFocus) {
      onFocus(event);
    }
  };
  const ownerState = _extends({}, props, {
    color: color2,
    component,
    focusVisible,
    underline,
    variant
  });
  const classes = useUtilityClasses$z(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LinkRoot, _extends({
    color: color2,
    className: clsx(classes.root, className),
    classes: TypographyClasses,
    component,
    onBlur: handleBlur,
    onFocus: handleFocus,
    ref: handlerRef,
    ownerState,
    variant,
    sx: [...!Object.keys(colorTransformations).includes(color2) ? [{
      color: color2
    }] : [], ...Array.isArray(sx) ? sx : [sx]]
  }, other));
});
function getMobileStepperUtilityClass(slot) {
  return generateUtilityClass$2("MuiMobileStepper", slot);
}
generateUtilityClasses("MuiMobileStepper", ["root", "positionBottom", "positionTop", "positionStatic", "dots", "dot", "dotActive", "progress"]);
const _excluded$A = ["activeStep", "backButton", "className", "LinearProgressProps", "nextButton", "position", "steps", "variant"];
const useUtilityClasses$y = (ownerState) => {
  const {
    classes,
    position: position2
  } = ownerState;
  const slots = {
    root: ["root", `position${capitalize$1(position2)}`],
    dots: ["dots"],
    dot: ["dot"],
    dotActive: ["dotActive"],
    progress: ["progress"]
  };
  return composeClasses(slots, getMobileStepperUtilityClass, classes);
};
const MobileStepperRoot = styled(Paper, {
  name: "MuiMobileStepper",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`position${capitalize$1(ownerState.position)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  background: (theme.vars || theme).palette.background.default,
  padding: 8
}, ownerState.position === "bottom" && {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: (theme.vars || theme).zIndex.mobileStepper
}, ownerState.position === "top" && {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: (theme.vars || theme).zIndex.mobileStepper
}));
const MobileStepperDots = styled("div", {
  name: "MuiMobileStepper",
  slot: "Dots",
  overridesResolver: (props, styles2) => styles2.dots
})(({
  ownerState
}) => _extends({}, ownerState.variant === "dots" && {
  display: "flex",
  flexDirection: "row"
}));
const MobileStepperDot = styled("div", {
  name: "MuiMobileStepper",
  slot: "Dot",
  shouldForwardProp: (prop) => slotShouldForwardProp(prop) && prop !== "dotActive",
  overridesResolver: (props, styles2) => {
    const {
      dotActive
    } = props;
    return [styles2.dot, dotActive && styles2.dotActive];
  }
})(({
  theme,
  ownerState,
  dotActive
}) => _extends({}, ownerState.variant === "dots" && _extends({
  transition: theme.transitions.create("background-color", {
    duration: theme.transitions.duration.shortest
  }),
  backgroundColor: (theme.vars || theme).palette.action.disabled,
  borderRadius: "50%",
  width: 8,
  height: 8,
  margin: "0 2px"
}, dotActive && {
  backgroundColor: (theme.vars || theme).palette.primary.main
})));
const MobileStepperProgress = styled(LinearProgress, {
  name: "MuiMobileStepper",
  slot: "Progress",
  overridesResolver: (props, styles2) => styles2.progress
})(({
  ownerState
}) => _extends({}, ownerState.variant === "progress" && {
  width: "50%"
}));
const MobileStepper = /* @__PURE__ */ reactExports.forwardRef(function MobileStepper2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiMobileStepper"
  });
  const {
    activeStep = 0,
    backButton,
    className,
    LinearProgressProps,
    nextButton,
    position: position2 = "bottom",
    steps,
    variant = "dots"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$A);
  const ownerState = _extends({}, props, {
    activeStep,
    position: position2,
    variant
  });
  let value;
  if (variant === "progress") {
    if (steps === 1) {
      value = 100;
    } else {
      value = Math.ceil(activeStep / (steps - 1) * 100);
    }
  }
  const classes = useUtilityClasses$y(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileStepperRoot, _extends({
    square: true,
    elevation: 0,
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: [backButton, variant === "text" && /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
      children: [activeStep + 1, " / ", steps]
    }), variant === "dots" && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileStepperDots, {
      ownerState,
      className: classes.dots,
      children: [...new Array(steps)].map((_2, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(MobileStepperDot, {
        className: clsx(classes.dot, index === activeStep && classes.dotActive),
        ownerState,
        dotActive: index === activeStep
      }, index))
    }), variant === "progress" && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileStepperProgress, _extends({
      ownerState,
      className: classes.progress,
      variant: "determinate",
      value
    }, LinearProgressProps)), nextButton]
  }));
});
const FirstPageIconDefault = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"
}), "FirstPage");
const LastPageIconDefault = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"
}), "LastPage");
const RadioButtonUncheckedIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
}), "RadioButtonUnchecked");
const RadioButtonCheckedIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M8.465 8.465C9.37 7.56 10.62 7 12 7C14.76 7 17 9.24 17 12C17 13.38 16.44 14.63 15.535 15.535C14.63 16.44 13.38 17 12 17C9.24 17 7 14.76 7 12C7 10.62 7.56 9.37 8.465 8.465Z"
}), "RadioButtonChecked");
const RadioButtonIconRoot = styled("span", {
  shouldForwardProp: rootShouldForwardProp
})({
  position: "relative",
  display: "flex"
});
const RadioButtonIconBackground = styled(RadioButtonUncheckedIcon)({
  // Scale applied to prevent dot misalignment in Safari
  transform: "scale(1)"
});
const RadioButtonIconDot = styled(RadioButtonCheckedIcon)(({
  theme,
  ownerState
}) => _extends({
  left: 0,
  position: "absolute",
  transform: "scale(0)",
  transition: theme.transitions.create("transform", {
    easing: theme.transitions.easing.easeIn,
    duration: theme.transitions.duration.shortest
  })
}, ownerState.checked && {
  transform: "scale(1)",
  transition: theme.transitions.create("transform", {
    easing: theme.transitions.easing.easeOut,
    duration: theme.transitions.duration.shortest
  })
}));
function RadioButtonIcon(props) {
  const {
    checked = false,
    classes = {},
    fontSize
  } = props;
  const ownerState = _extends({}, props, {
    checked
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(RadioButtonIconRoot, {
    className: classes.root,
    ownerState,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonIconBackground, {
      fontSize,
      className: classes.background,
      ownerState
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonIconDot, {
      fontSize,
      className: classes.dot,
      ownerState
    })]
  });
}
const RadioGroupContext = /* @__PURE__ */ reactExports.createContext(void 0);
function useRadioGroup() {
  return reactExports.useContext(RadioGroupContext);
}
function getRadioUtilityClass(slot) {
  return generateUtilityClass$2("MuiRadio", slot);
}
const radioClasses = generateUtilityClasses("MuiRadio", ["root", "checked", "disabled", "colorPrimary", "colorSecondary", "sizeSmall"]);
const _excluded$z = ["checked", "checkedIcon", "color", "icon", "name", "onChange", "size", "className"];
const useUtilityClasses$x = (ownerState) => {
  const {
    classes,
    color: color2,
    size
  } = ownerState;
  const slots = {
    root: ["root", `color${capitalize$1(color2)}`, size !== "medium" && `size${capitalize$1(size)}`]
  };
  return _extends({}, classes, composeClasses(slots, getRadioUtilityClass, classes));
};
const RadioRoot = styled(SwitchBase, {
  shouldForwardProp: (prop) => rootShouldForwardProp(prop) || prop === "classes",
  name: "MuiRadio",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.size !== "medium" && styles2[`size${capitalize$1(ownerState.size)}`], styles2[`color${capitalize$1(ownerState.color)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  color: (theme.vars || theme).palette.text.secondary
}, !ownerState.disableRipple && {
  "&:hover": {
    backgroundColor: theme.vars ? `rgba(${ownerState.color === "default" ? theme.vars.palette.action.activeChannel : theme.vars.palette[ownerState.color].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(ownerState.color === "default" ? theme.palette.action.active : theme.palette[ownerState.color].main, theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  }
}, ownerState.color !== "default" && {
  [`&.${radioClasses.checked}`]: {
    color: (theme.vars || theme).palette[ownerState.color].main
  }
}, {
  [`&.${radioClasses.disabled}`]: {
    color: (theme.vars || theme).palette.action.disabled
  }
}));
function areEqualValues(a, b2) {
  if (typeof b2 === "object" && b2 !== null) {
    return a === b2;
  }
  return String(a) === String(b2);
}
const defaultCheckedIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonIcon, {
  checked: true
});
const defaultIcon$1 = /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonIcon, {});
const Radio = /* @__PURE__ */ reactExports.forwardRef(function Radio2(inProps, ref) {
  var _defaultIcon$props$fo, _defaultCheckedIcon$p;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiRadio"
  });
  const {
    checked: checkedProp,
    checkedIcon = defaultCheckedIcon,
    color: color2 = "primary",
    icon = defaultIcon$1,
    name: nameProp,
    onChange: onChangeProp,
    size = "medium",
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$z);
  const ownerState = _extends({}, props, {
    color: color2,
    size
  });
  const classes = useUtilityClasses$x(ownerState);
  const radioGroup = useRadioGroup();
  let checked = checkedProp;
  const onChange = createChainedFunction(onChangeProp, radioGroup && radioGroup.onChange);
  let name = nameProp;
  if (radioGroup) {
    if (typeof checked === "undefined") {
      checked = areEqualValues(radioGroup.value, props.value);
    }
    if (typeof name === "undefined") {
      name = radioGroup.name;
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioRoot, _extends({
    type: "radio",
    icon: /* @__PURE__ */ reactExports.cloneElement(icon, {
      fontSize: (_defaultIcon$props$fo = defaultIcon$1.props.fontSize) != null ? _defaultIcon$props$fo : size
    }),
    checkedIcon: /* @__PURE__ */ reactExports.cloneElement(checkedIcon, {
      fontSize: (_defaultCheckedIcon$p = defaultCheckedIcon.props.fontSize) != null ? _defaultCheckedIcon$p : size
    }),
    ownerState,
    classes,
    name,
    checked,
    onChange,
    ref,
    className: clsx(classes.root, className)
  }, other));
});
function getRadioGroupUtilityClass(slot) {
  return generateUtilityClass$2("MuiRadioGroup", slot);
}
generateUtilityClasses("MuiRadioGroup", ["root", "row", "error"]);
const _excluded$y = ["actions", "children", "className", "defaultValue", "name", "onChange", "value"];
const useUtilityClasses$w = (props) => {
  const {
    classes,
    row,
    error
  } = props;
  const slots = {
    root: ["root", row && "row", error && "error"]
  };
  return composeClasses(slots, getRadioGroupUtilityClass, classes);
};
const RadioGroup = /* @__PURE__ */ reactExports.forwardRef(function RadioGroup2(props, ref) {
  const {
    // private
    // eslint-disable-next-line react/prop-types
    actions,
    children,
    className,
    defaultValue,
    name: nameProp,
    onChange,
    value: valueProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$y);
  const rootRef = reactExports.useRef(null);
  const classes = useUtilityClasses$w(props);
  const [value, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: "RadioGroup"
  });
  reactExports.useImperativeHandle(actions, () => ({
    focus: () => {
      let input = rootRef.current.querySelector("input:not(:disabled):checked");
      if (!input) {
        input = rootRef.current.querySelector("input:not(:disabled)");
      }
      if (input) {
        input.focus();
      }
    }
  }), []);
  const handleRef = useForkRef(ref, rootRef);
  const name = useId(nameProp);
  const contextValue = reactExports.useMemo(() => ({
    name,
    onChange(event) {
      setValueState(event.target.value);
      if (onChange) {
        onChange(event, event.target.value);
      }
    },
    value
  }), [name, onChange, setValueState, value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupContext.Provider, {
    value: contextValue,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormGroup, _extends({
      role: "radiogroup",
      ref: handleRef,
      className: clsx(classes.root, className)
    }, other, {
      children
    }))
  });
});
const Star$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
}), "Star");
const StarBorder = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"
}), "StarBorder");
function getRatingUtilityClass(slot) {
  return generateUtilityClass$2("MuiRating", slot);
}
const ratingClasses = generateUtilityClasses("MuiRating", ["root", "sizeSmall", "sizeMedium", "sizeLarge", "readOnly", "disabled", "focusVisible", "visuallyHidden", "pristine", "label", "labelEmptyValueActive", "icon", "iconEmpty", "iconFilled", "iconHover", "iconFocus", "iconActive", "decimal"]);
const _excluded$x = ["value"], _excluded2$3 = ["className", "defaultValue", "disabled", "emptyIcon", "emptyLabelText", "getLabelText", "highlightSelectedOnly", "icon", "IconContainerComponent", "max", "name", "onChange", "onChangeActive", "onMouseLeave", "onMouseMove", "precision", "readOnly", "size", "value"];
function getDecimalPrecision(num) {
  const decimalPart = num.toString().split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}
function roundValueToPrecision(value, precision) {
  if (value == null) {
    return value;
  }
  const nearest = Math.round(value / precision) * precision;
  return Number(nearest.toFixed(getDecimalPrecision(precision)));
}
const useUtilityClasses$v = (ownerState) => {
  const {
    classes,
    size,
    readOnly,
    disabled,
    emptyValueFocused,
    focusVisible
  } = ownerState;
  const slots = {
    root: ["root", `size${capitalize$1(size)}`, disabled && "disabled", focusVisible && "focusVisible", readOnly && "readOnly"],
    label: ["label", "pristine"],
    labelEmptyValue: [emptyValueFocused && "labelEmptyValueActive"],
    icon: ["icon"],
    iconEmpty: ["iconEmpty"],
    iconFilled: ["iconFilled"],
    iconHover: ["iconHover"],
    iconFocus: ["iconFocus"],
    iconActive: ["iconActive"],
    decimal: ["decimal"],
    visuallyHidden: ["visuallyHidden"]
  };
  return composeClasses(slots, getRatingUtilityClass, classes);
};
const RatingRoot = styled("span", {
  name: "MuiRating",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${ratingClasses.visuallyHidden}`]: styles2.visuallyHidden
    }, styles2.root, styles2[`size${capitalize$1(ownerState.size)}`], ownerState.readOnly && styles2.readOnly];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "inline-flex",
  // Required to position the pristine input absolutely
  position: "relative",
  fontSize: theme.typography.pxToRem(24),
  color: "#faaf00",
  cursor: "pointer",
  textAlign: "left",
  width: "min-content",
  WebkitTapHighlightColor: "transparent",
  [`&.${ratingClasses.disabled}`]: {
    opacity: (theme.vars || theme).palette.action.disabledOpacity,
    pointerEvents: "none"
  },
  [`&.${ratingClasses.focusVisible} .${ratingClasses.iconActive}`]: {
    outline: "1px solid #999"
  },
  [`& .${ratingClasses.visuallyHidden}`]: visuallyHidden
}, ownerState.size === "small" && {
  fontSize: theme.typography.pxToRem(18)
}, ownerState.size === "large" && {
  fontSize: theme.typography.pxToRem(30)
}, ownerState.readOnly && {
  pointerEvents: "none"
}));
const RatingLabel = styled("label", {
  name: "MuiRating",
  slot: "Label",
  overridesResolver: ({
    ownerState
  }, styles2) => [styles2.label, ownerState.emptyValueFocused && styles2.labelEmptyValueActive]
})(({
  ownerState
}) => _extends({
  cursor: "inherit"
}, ownerState.emptyValueFocused && {
  top: 0,
  bottom: 0,
  position: "absolute",
  outline: "1px solid #999",
  width: "100%"
}));
const RatingIcon = styled("span", {
  name: "MuiRating",
  slot: "Icon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.icon, ownerState.iconEmpty && styles2.iconEmpty, ownerState.iconFilled && styles2.iconFilled, ownerState.iconHover && styles2.iconHover, ownerState.iconFocus && styles2.iconFocus, ownerState.iconActive && styles2.iconActive];
  }
})(({
  theme,
  ownerState
}) => _extends({
  // Fit wrapper to actual icon size.
  display: "flex",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest
  }),
  // Fix mouseLeave issue.
  // https://github.com/facebook/react/issues/4492
  pointerEvents: "none"
}, ownerState.iconActive && {
  transform: "scale(1.2)"
}, ownerState.iconEmpty && {
  color: (theme.vars || theme).palette.action.disabled
}));
const RatingDecimal = styled("span", {
  name: "MuiRating",
  slot: "Decimal",
  shouldForwardProp: (prop) => slotShouldForwardProp(prop) && prop !== "iconActive",
  overridesResolver: (props, styles2) => {
    const {
      iconActive
    } = props;
    return [styles2.decimal, iconActive && styles2.iconActive];
  }
})(({
  iconActive
}) => _extends({
  position: "relative"
}, iconActive && {
  transform: "scale(1.2)"
}));
function IconContainer(props) {
  const other = _objectWithoutPropertiesLoose(props, _excluded$x);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", _extends({}, other));
}
function RatingItem(props) {
  const {
    classes,
    disabled,
    emptyIcon,
    focus,
    getLabelText,
    highlightSelectedOnly,
    hover,
    icon,
    IconContainerComponent,
    isActive,
    itemValue,
    labelProps,
    name,
    onBlur,
    onChange,
    onClick,
    onFocus,
    readOnly,
    ownerState,
    ratingValue,
    ratingValueRounded
  } = props;
  const isFilled2 = highlightSelectedOnly ? itemValue === ratingValue : itemValue <= ratingValue;
  const isHovered = itemValue <= hover;
  const isFocused = itemValue <= focus;
  const isChecked = itemValue === ratingValueRounded;
  const id = useId();
  const container = /* @__PURE__ */ jsxRuntimeExports.jsx(RatingIcon, {
    as: IconContainerComponent,
    value: itemValue,
    className: clsx(classes.icon, isFilled2 ? classes.iconFilled : classes.iconEmpty, isHovered && classes.iconHover, isFocused && classes.iconFocus, isActive && classes.iconActive),
    ownerState: _extends({}, ownerState, {
      iconEmpty: !isFilled2,
      iconFilled: isFilled2,
      iconHover: isHovered,
      iconFocus: isFocused,
      iconActive: isActive
    }),
    children: emptyIcon && !isFilled2 ? emptyIcon : icon
  });
  if (readOnly) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", _extends({}, labelProps, {
      children: container
    }));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(RatingLabel, _extends({
      ownerState: _extends({}, ownerState, {
        emptyValueFocused: void 0
      }),
      htmlFor: id
    }, labelProps, {
      children: [container, /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: classes.visuallyHidden,
        children: getLabelText(itemValue)
      })]
    })), /* @__PURE__ */ jsxRuntimeExports.jsx("input", {
      className: classes.visuallyHidden,
      onFocus,
      onBlur,
      onChange,
      onClick,
      disabled,
      value: itemValue,
      id,
      type: "radio",
      name,
      checked: isChecked
    })]
  });
}
const defaultIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(Star$1, {
  fontSize: "inherit"
});
const defaultEmptyIcon = /* @__PURE__ */ jsxRuntimeExports.jsx(StarBorder, {
  fontSize: "inherit"
});
function defaultLabelText(value) {
  return `${value} Star${value !== 1 ? "s" : ""}`;
}
const Rating = /* @__PURE__ */ reactExports.forwardRef(function Rating2(inProps, ref) {
  const props = useThemeProps$a({
    name: "MuiRating",
    props: inProps
  });
  const {
    className,
    defaultValue = null,
    disabled = false,
    emptyIcon = defaultEmptyIcon,
    emptyLabelText = "Empty",
    getLabelText = defaultLabelText,
    highlightSelectedOnly = false,
    icon = defaultIcon,
    IconContainerComponent = IconContainer,
    max = 5,
    name: nameProp,
    onChange,
    onChangeActive,
    onMouseLeave,
    onMouseMove,
    precision = 1,
    readOnly = false,
    size = "medium",
    value: valueProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded2$3);
  const name = useId(nameProp);
  const [valueDerived, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: "Rating"
  });
  const valueRounded = roundValueToPrecision(valueDerived, precision);
  const isRtl = useRtl();
  const [{
    hover,
    focus
  }, setState] = reactExports.useState({
    hover: -1,
    focus: -1
  });
  let value = valueRounded;
  if (hover !== -1) {
    value = hover;
  }
  if (focus !== -1) {
    value = focus;
  }
  const {
    isFocusVisibleRef,
    onBlur: handleBlurVisible,
    onFocus: handleFocusVisible,
    ref: focusVisibleRef
  } = useIsFocusVisible();
  const [focusVisible, setFocusVisible] = reactExports.useState(false);
  const rootRef = reactExports.useRef();
  const handleRef = useForkRef(focusVisibleRef, rootRef, ref);
  const handleMouseMove = (event) => {
    if (onMouseMove) {
      onMouseMove(event);
    }
    const rootNode = rootRef.current;
    const {
      right,
      left,
      width: containerWidth
    } = rootNode.getBoundingClientRect();
    let percent;
    if (isRtl) {
      percent = (right - event.clientX) / containerWidth;
    } else {
      percent = (event.clientX - left) / containerWidth;
    }
    let newHover = roundValueToPrecision(max * percent + precision / 2, precision);
    newHover = clamp$1(newHover, precision, max);
    setState((prev) => prev.hover === newHover && prev.focus === newHover ? prev : {
      hover: newHover,
      focus: newHover
    });
    setFocusVisible(false);
    if (onChangeActive && hover !== newHover) {
      onChangeActive(event, newHover);
    }
  };
  const handleMouseLeave = (event) => {
    if (onMouseLeave) {
      onMouseLeave(event);
    }
    const newHover = -1;
    setState({
      hover: newHover,
      focus: newHover
    });
    if (onChangeActive && hover !== newHover) {
      onChangeActive(event, newHover);
    }
  };
  const handleChange = (event) => {
    let newValue = event.target.value === "" ? null : parseFloat(event.target.value);
    if (hover !== -1) {
      newValue = hover;
    }
    setValueState(newValue);
    if (onChange) {
      onChange(event, newValue);
    }
  };
  const handleClear = (event) => {
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    setState({
      hover: -1,
      focus: -1
    });
    setValueState(null);
    if (onChange && parseFloat(event.target.value) === valueRounded) {
      onChange(event, null);
    }
  };
  const handleFocus = (event) => {
    handleFocusVisible(event);
    if (isFocusVisibleRef.current === true) {
      setFocusVisible(true);
    }
    const newFocus = parseFloat(event.target.value);
    setState((prev) => ({
      hover: prev.hover,
      focus: newFocus
    }));
  };
  const handleBlur = (event) => {
    if (hover !== -1) {
      return;
    }
    handleBlurVisible(event);
    if (isFocusVisibleRef.current === false) {
      setFocusVisible(false);
    }
    const newFocus = -1;
    setState((prev) => ({
      hover: prev.hover,
      focus: newFocus
    }));
  };
  const [emptyValueFocused, setEmptyValueFocused] = reactExports.useState(false);
  const ownerState = _extends({}, props, {
    defaultValue,
    disabled,
    emptyIcon,
    emptyLabelText,
    emptyValueFocused,
    focusVisible,
    getLabelText,
    icon,
    IconContainerComponent,
    max,
    precision,
    readOnly,
    size
  });
  const classes = useUtilityClasses$v(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(RatingRoot, _extends({
    ref: handleRef,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    className: clsx(classes.root, className, readOnly && "MuiRating-readOnly"),
    ownerState,
    role: readOnly ? "img" : null,
    "aria-label": readOnly ? getLabelText(value) : null
  }, other, {
    children: [Array.from(new Array(max)).map((_2, index) => {
      const itemValue = index + 1;
      const ratingItemProps = {
        classes,
        disabled,
        emptyIcon,
        focus,
        getLabelText,
        highlightSelectedOnly,
        hover,
        icon,
        IconContainerComponent,
        name,
        onBlur: handleBlur,
        onChange: handleChange,
        onClick: handleClear,
        onFocus: handleFocus,
        ratingValue: value,
        ratingValueRounded: valueRounded,
        readOnly,
        ownerState
      };
      const isActive = itemValue === Math.ceil(value) && (hover !== -1 || focus !== -1);
      if (precision < 1) {
        const items = Array.from(new Array(1 / precision));
        return /* @__PURE__ */ jsxRuntimeExports.jsx(RatingDecimal, {
          className: clsx(classes.decimal, isActive && classes.iconActive),
          ownerState,
          iconActive: isActive,
          children: items.map(($, indexDecimal) => {
            const itemDecimalValue = roundValueToPrecision(itemValue - 1 + (indexDecimal + 1) * precision, precision);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(RatingItem, _extends({}, ratingItemProps, {
              // The icon is already displayed as active
              isActive: false,
              itemValue: itemDecimalValue,
              labelProps: {
                style: items.length - 1 === indexDecimal ? {} : {
                  width: itemDecimalValue === value ? `${(indexDecimal + 1) * precision * 100}%` : "0%",
                  overflow: "hidden",
                  position: "absolute"
                }
              }
            }), itemDecimalValue);
          })
        }, itemValue);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RatingItem, _extends({}, ratingItemProps, {
        isActive,
        itemValue
      }), itemValue);
    }), !readOnly && !disabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(RatingLabel, {
      className: clsx(classes.label, classes.labelEmptyValue),
      ownerState,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
        className: classes.visuallyHidden,
        value: "",
        id: `${name}-empty`,
        type: "radio",
        name,
        checked: valueRounded == null,
        onFocus: () => setEmptyValueFocused(true),
        onBlur: () => setEmptyValueFocused(false),
        onChange: handleChange
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: classes.visuallyHidden,
        children: emptyLabelText
      })]
    })]
  }));
});
const shouldSpreadAdditionalProps = (Slot) => {
  return !Slot || !isHostComponent(Slot);
};
function getSliderUtilityClass(slot) {
  return generateUtilityClass$2("MuiSlider", slot);
}
const sliderClasses = generateUtilityClasses("MuiSlider", ["root", "active", "colorPrimary", "colorSecondary", "colorError", "colorInfo", "colorSuccess", "colorWarning", "disabled", "dragging", "focusVisible", "mark", "markActive", "marked", "markLabel", "markLabelActive", "rail", "sizeSmall", "thumb", "thumbColorPrimary", "thumbColorSecondary", "thumbColorError", "thumbColorSuccess", "thumbColorInfo", "thumbColorWarning", "track", "trackInverted", "trackFalse", "thumbSizeSmall", "valueLabel", "valueLabelOpen", "valueLabelCircle", "valueLabelLabel", "vertical"]);
const useValueLabelClasses = (props) => {
  const {
    open
  } = props;
  const utilityClasses = {
    offset: clsx(open && sliderClasses.valueLabelOpen),
    circle: sliderClasses.valueLabelCircle,
    label: sliderClasses.valueLabelLabel
  };
  return utilityClasses;
};
function SliderValueLabel$1(props) {
  const {
    children,
    className,
    value
  } = props;
  const classes = useValueLabelClasses(props);
  if (!children) {
    return null;
  }
  return /* @__PURE__ */ reactExports.cloneElement(children, {
    className: clsx(children.props.className)
  }, /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [children.props.children, /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
      className: clsx(classes.offset, className),
      "aria-hidden": true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: classes.circle,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: classes.label,
          children: value
        })
      })
    })]
  }));
}
const _excluded$w = ["aria-label", "aria-valuetext", "aria-labelledby", "component", "components", "componentsProps", "color", "classes", "className", "disableSwap", "disabled", "getAriaLabel", "getAriaValueText", "marks", "max", "min", "name", "onChange", "onChangeCommitted", "orientation", "shiftStep", "size", "step", "scale", "slotProps", "slots", "tabIndex", "track", "value", "valueLabelDisplay", "valueLabelFormat"];
const useThemeProps$1 = createUseThemeProps();
function Identity(x) {
  return x;
}
const SliderRoot = styled("span", {
  name: "MuiSlider",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`color${capitalize$1(ownerState.color)}`], ownerState.size !== "medium" && styles2[`size${capitalize$1(ownerState.size)}`], ownerState.marked && styles2.marked, ownerState.orientation === "vertical" && styles2.vertical, ownerState.track === "inverted" && styles2.trackInverted, ownerState.track === false && styles2.trackFalse];
  }
})(({
  theme
}) => {
  var _theme$vars;
  return {
    borderRadius: 12,
    boxSizing: "content-box",
    display: "inline-block",
    position: "relative",
    cursor: "pointer",
    touchAction: "none",
    WebkitTapHighlightColor: "transparent",
    "@media print": {
      colorAdjust: "exact"
    },
    [`&.${sliderClasses.disabled}`]: {
      pointerEvents: "none",
      cursor: "default",
      color: (theme.vars || theme).palette.grey[400]
    },
    [`&.${sliderClasses.dragging}`]: {
      [`& .${sliderClasses.thumb}, & .${sliderClasses.track}`]: {
        transition: "none"
      }
    },
    variants: [...Object.keys(((_theme$vars = theme.vars) != null ? _theme$vars : theme).palette).filter((key) => {
      var _theme$vars2;
      return ((_theme$vars2 = theme.vars) != null ? _theme$vars2 : theme).palette[key].main;
    }).map((color2) => ({
      props: {
        color: color2
      },
      style: {
        color: (theme.vars || theme).palette[color2].main
      }
    })), {
      props: {
        orientation: "horizontal"
      },
      style: {
        height: 4,
        width: "100%",
        padding: "13px 0",
        // The primary input mechanism of the device includes a pointing device of limited accuracy.
        "@media (pointer: coarse)": {
          // Reach 42px touch target, about ~8mm on screen.
          padding: "20px 0"
        }
      }
    }, {
      props: {
        orientation: "horizontal",
        size: "small"
      },
      style: {
        height: 2
      }
    }, {
      props: {
        orientation: "horizontal",
        marked: true
      },
      style: {
        marginBottom: 20
      }
    }, {
      props: {
        orientation: "vertical"
      },
      style: {
        height: "100%",
        width: 4,
        padding: "0 13px",
        // The primary input mechanism of the device includes a pointing device of limited accuracy.
        "@media (pointer: coarse)": {
          // Reach 42px touch target, about ~8mm on screen.
          padding: "0 20px"
        }
      }
    }, {
      props: {
        orientation: "vertical",
        size: "small"
      },
      style: {
        width: 2
      }
    }, {
      props: {
        orientation: "vertical",
        marked: true
      },
      style: {
        marginRight: 44
      }
    }]
  };
});
const SliderRail = styled("span", {
  name: "MuiSlider",
  slot: "Rail",
  overridesResolver: (props, styles2) => styles2.rail
})({
  display: "block",
  position: "absolute",
  borderRadius: "inherit",
  backgroundColor: "currentColor",
  opacity: 0.38,
  variants: [{
    props: {
      orientation: "horizontal"
    },
    style: {
      width: "100%",
      height: "inherit",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }, {
    props: {
      orientation: "vertical"
    },
    style: {
      height: "100%",
      width: "inherit",
      left: "50%",
      transform: "translateX(-50%)"
    }
  }, {
    props: {
      track: "inverted"
    },
    style: {
      opacity: 1
    }
  }]
});
const SliderTrack = styled("span", {
  name: "MuiSlider",
  slot: "Track",
  overridesResolver: (props, styles2) => styles2.track
})(({
  theme
}) => {
  var _theme$vars3;
  return {
    display: "block",
    position: "absolute",
    borderRadius: "inherit",
    border: "1px solid currentColor",
    backgroundColor: "currentColor",
    transition: theme.transitions.create(["left", "width", "bottom", "height"], {
      duration: theme.transitions.duration.shortest
    }),
    variants: [{
      props: {
        size: "small"
      },
      style: {
        border: "none"
      }
    }, {
      props: {
        orientation: "horizontal"
      },
      style: {
        height: "inherit",
        top: "50%",
        transform: "translateY(-50%)"
      }
    }, {
      props: {
        orientation: "vertical"
      },
      style: {
        width: "inherit",
        left: "50%",
        transform: "translateX(-50%)"
      }
    }, {
      props: {
        track: false
      },
      style: {
        display: "none"
      }
    }, ...Object.keys(((_theme$vars3 = theme.vars) != null ? _theme$vars3 : theme).palette).filter((key) => {
      var _theme$vars4;
      return ((_theme$vars4 = theme.vars) != null ? _theme$vars4 : theme).palette[key].main;
    }).map((color2) => ({
      props: {
        color: color2,
        track: "inverted"
      },
      style: _extends({}, theme.vars ? {
        backgroundColor: theme.vars.palette.Slider[`${color2}Track`],
        borderColor: theme.vars.palette.Slider[`${color2}Track`]
      } : _extends({
        backgroundColor: lighten_1(theme.palette[color2].main, 0.62),
        borderColor: lighten_1(theme.palette[color2].main, 0.62)
      }, theme.applyStyles("dark", {
        backgroundColor: darken_1(theme.palette[color2].main, 0.5)
      }), theme.applyStyles("dark", {
        borderColor: darken_1(theme.palette[color2].main, 0.5)
      })))
    }))]
  };
});
const SliderThumb = styled("span", {
  name: "MuiSlider",
  slot: "Thumb",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.thumb, styles2[`thumbColor${capitalize$1(ownerState.color)}`], ownerState.size !== "medium" && styles2[`thumbSize${capitalize$1(ownerState.size)}`]];
  }
})(({
  theme
}) => {
  var _theme$vars5;
  return {
    position: "absolute",
    width: 20,
    height: 20,
    boxSizing: "border-box",
    borderRadius: "50%",
    outline: 0,
    backgroundColor: "currentColor",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: theme.transitions.create(["box-shadow", "left", "bottom"], {
      duration: theme.transitions.duration.shortest
    }),
    "&::before": {
      position: "absolute",
      content: '""',
      borderRadius: "inherit",
      width: "100%",
      height: "100%",
      boxShadow: (theme.vars || theme).shadows[2]
    },
    "&::after": {
      position: "absolute",
      content: '""',
      borderRadius: "50%",
      // 42px is the hit target
      width: 42,
      height: 42,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)"
    },
    [`&.${sliderClasses.disabled}`]: {
      "&:hover": {
        boxShadow: "none"
      }
    },
    variants: [...Object.keys(((_theme$vars5 = theme.vars) != null ? _theme$vars5 : theme).palette).filter((key) => {
      var _theme$vars6;
      return ((_theme$vars6 = theme.vars) != null ? _theme$vars6 : theme).palette[key].main;
    }).map((color2) => ({
      props: {
        color: color2
      },
      style: {
        [`&:hover, &.${sliderClasses.focusVisible}`]: _extends({}, theme.vars ? {
          boxShadow: `0px 0px 0px 8px rgba(${theme.vars.palette[color2].mainChannel} / 0.16)`
        } : {
          boxShadow: `0px 0px 0px 8px ${alpha_1(theme.palette[color2].main, 0.16)}`
        }, {
          "@media (hover: none)": {
            boxShadow: "none"
          }
        }),
        [`&.${sliderClasses.active}`]: _extends({}, theme.vars ? {
          boxShadow: `0px 0px 0px 14px rgba(${theme.vars.palette[color2].mainChannel} / 0.16)}`
        } : {
          boxShadow: `0px 0px 0px 14px ${alpha_1(theme.palette[color2].main, 0.16)}`
        })
      }
    })), {
      props: {
        size: "small"
      },
      style: {
        width: 12,
        height: 12,
        "&::before": {
          boxShadow: "none"
        }
      }
    }, {
      props: {
        orientation: "horizontal"
      },
      style: {
        top: "50%",
        transform: "translate(-50%, -50%)"
      }
    }, {
      props: {
        orientation: "vertical"
      },
      style: {
        left: "50%",
        transform: "translate(-50%, 50%)"
      }
    }]
  };
});
const SliderValueLabel = styled(SliderValueLabel$1, {
  name: "MuiSlider",
  slot: "ValueLabel",
  overridesResolver: (props, styles2) => styles2.valueLabel
})(({
  theme
}) => _extends({
  zIndex: 1,
  whiteSpace: "nowrap"
}, theme.typography.body2, {
  fontWeight: 500,
  transition: theme.transitions.create(["transform"], {
    duration: theme.transitions.duration.shortest
  }),
  position: "absolute",
  backgroundColor: (theme.vars || theme).palette.grey[600],
  borderRadius: 2,
  color: (theme.vars || theme).palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.25rem 0.75rem",
  variants: [{
    props: {
      orientation: "horizontal"
    },
    style: {
      transform: "translateY(-100%) scale(0)",
      top: "-10px",
      transformOrigin: "bottom center",
      "&::before": {
        position: "absolute",
        content: '""',
        width: 8,
        height: 8,
        transform: "translate(-50%, 50%) rotate(45deg)",
        backgroundColor: "inherit",
        bottom: 0,
        left: "50%"
      },
      [`&.${sliderClasses.valueLabelOpen}`]: {
        transform: "translateY(-100%) scale(1)"
      }
    }
  }, {
    props: {
      orientation: "vertical"
    },
    style: {
      transform: "translateY(-50%) scale(0)",
      right: "30px",
      top: "50%",
      transformOrigin: "right center",
      "&::before": {
        position: "absolute",
        content: '""',
        width: 8,
        height: 8,
        transform: "translate(-50%, -50%) rotate(45deg)",
        backgroundColor: "inherit",
        right: -8,
        top: "50%"
      },
      [`&.${sliderClasses.valueLabelOpen}`]: {
        transform: "translateY(-50%) scale(1)"
      }
    }
  }, {
    props: {
      size: "small"
    },
    style: {
      fontSize: theme.typography.pxToRem(12),
      padding: "0.25rem 0.5rem"
    }
  }, {
    props: {
      orientation: "vertical",
      size: "small"
    },
    style: {
      right: "20px"
    }
  }]
}));
const SliderMark = styled("span", {
  name: "MuiSlider",
  slot: "Mark",
  shouldForwardProp: (prop) => slotShouldForwardProp(prop) && prop !== "markActive",
  overridesResolver: (props, styles2) => {
    const {
      markActive
    } = props;
    return [styles2.mark, markActive && styles2.markActive];
  }
})(({
  theme
}) => ({
  position: "absolute",
  width: 2,
  height: 2,
  borderRadius: 1,
  backgroundColor: "currentColor",
  variants: [{
    props: {
      orientation: "horizontal"
    },
    style: {
      top: "50%",
      transform: "translate(-1px, -50%)"
    }
  }, {
    props: {
      orientation: "vertical"
    },
    style: {
      left: "50%",
      transform: "translate(-50%, 1px)"
    }
  }, {
    props: {
      markActive: true
    },
    style: {
      backgroundColor: (theme.vars || theme).palette.background.paper,
      opacity: 0.8
    }
  }]
}));
const SliderMarkLabel = styled("span", {
  name: "MuiSlider",
  slot: "MarkLabel",
  shouldForwardProp: (prop) => slotShouldForwardProp(prop) && prop !== "markLabelActive",
  overridesResolver: (props, styles2) => styles2.markLabel
})(({
  theme
}) => _extends({}, theme.typography.body2, {
  color: (theme.vars || theme).palette.text.secondary,
  position: "absolute",
  whiteSpace: "nowrap",
  variants: [{
    props: {
      orientation: "horizontal"
    },
    style: {
      top: 30,
      transform: "translateX(-50%)",
      "@media (pointer: coarse)": {
        top: 40
      }
    }
  }, {
    props: {
      orientation: "vertical"
    },
    style: {
      left: 36,
      transform: "translateY(50%)",
      "@media (pointer: coarse)": {
        left: 44
      }
    }
  }, {
    props: {
      markLabelActive: true
    },
    style: {
      color: (theme.vars || theme).palette.text.primary
    }
  }]
}));
const useUtilityClasses$u = (ownerState) => {
  const {
    disabled,
    dragging,
    marked,
    orientation,
    track,
    classes,
    color: color2,
    size
  } = ownerState;
  const slots = {
    root: ["root", disabled && "disabled", dragging && "dragging", marked && "marked", orientation === "vertical" && "vertical", track === "inverted" && "trackInverted", track === false && "trackFalse", color2 && `color${capitalize$1(color2)}`, size && `size${capitalize$1(size)}`],
    rail: ["rail"],
    track: ["track"],
    mark: ["mark"],
    markActive: ["markActive"],
    markLabel: ["markLabel"],
    markLabelActive: ["markLabelActive"],
    valueLabel: ["valueLabel"],
    thumb: ["thumb", disabled && "disabled", size && `thumbSize${capitalize$1(size)}`, color2 && `thumbColor${capitalize$1(color2)}`],
    active: ["active"],
    disabled: ["disabled"],
    focusVisible: ["focusVisible"]
  };
  return composeClasses(slots, getSliderUtilityClass, classes);
};
const Forward = ({
  children
}) => children;
const Slider = /* @__PURE__ */ reactExports.forwardRef(function Slider2(inputProps, ref) {
  var _ref, _slots$root, _ref2, _slots$rail, _ref3, _slots$track, _ref4, _slots$thumb, _ref5, _slots$valueLabel, _ref6, _slots$mark, _ref7, _slots$markLabel, _ref8, _slots$input, _slotProps$root, _slotProps$rail, _slotProps$track, _slotProps$thumb, _slotProps$valueLabel, _slotProps$mark, _slotProps$markLabel, _slotProps$input;
  const props = useThemeProps$1({
    props: inputProps,
    name: "MuiSlider"
  });
  const isRtl = useRtl();
  const {
    "aria-label": ariaLabel,
    "aria-valuetext": ariaValuetext,
    "aria-labelledby": ariaLabelledby,
    // eslint-disable-next-line react/prop-types
    component = "span",
    components = {},
    componentsProps = {},
    color: color2 = "primary",
    classes: classesProp,
    className,
    disableSwap = false,
    disabled = false,
    getAriaLabel,
    getAriaValueText,
    marks: marksProp = false,
    max = 100,
    min = 0,
    orientation = "horizontal",
    shiftStep = 10,
    size = "medium",
    step = 1,
    scale = Identity,
    slotProps,
    slots,
    track = "normal",
    valueLabelDisplay = "off",
    valueLabelFormat = Identity
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$w);
  const ownerState = _extends({}, props, {
    isRtl,
    max,
    min,
    classes: classesProp,
    disabled,
    disableSwap,
    orientation,
    marks: marksProp,
    color: color2,
    size,
    step,
    shiftStep,
    scale,
    track,
    valueLabelDisplay,
    valueLabelFormat
  });
  const {
    axisProps: axisProps2,
    getRootProps,
    getHiddenInputProps,
    getThumbProps,
    open,
    active,
    axis,
    focusedThumbIndex,
    range,
    dragging,
    marks,
    values: values2,
    trackOffset,
    trackLeap,
    getThumbStyle
  } = useSlider(_extends({}, ownerState, {
    rootRef: ref
  }));
  ownerState.marked = marks.length > 0 && marks.some((mark) => mark.label);
  ownerState.dragging = dragging;
  ownerState.focusedThumbIndex = focusedThumbIndex;
  const classes = useUtilityClasses$u(ownerState);
  const RootSlot = (_ref = (_slots$root = slots == null ? void 0 : slots.root) != null ? _slots$root : components.Root) != null ? _ref : SliderRoot;
  const RailSlot = (_ref2 = (_slots$rail = slots == null ? void 0 : slots.rail) != null ? _slots$rail : components.Rail) != null ? _ref2 : SliderRail;
  const TrackSlot = (_ref3 = (_slots$track = slots == null ? void 0 : slots.track) != null ? _slots$track : components.Track) != null ? _ref3 : SliderTrack;
  const ThumbSlot = (_ref4 = (_slots$thumb = slots == null ? void 0 : slots.thumb) != null ? _slots$thumb : components.Thumb) != null ? _ref4 : SliderThumb;
  const ValueLabelSlot = (_ref5 = (_slots$valueLabel = slots == null ? void 0 : slots.valueLabel) != null ? _slots$valueLabel : components.ValueLabel) != null ? _ref5 : SliderValueLabel;
  const MarkSlot = (_ref6 = (_slots$mark = slots == null ? void 0 : slots.mark) != null ? _slots$mark : components.Mark) != null ? _ref6 : SliderMark;
  const MarkLabelSlot = (_ref7 = (_slots$markLabel = slots == null ? void 0 : slots.markLabel) != null ? _slots$markLabel : components.MarkLabel) != null ? _ref7 : SliderMarkLabel;
  const InputSlot = (_ref8 = (_slots$input = slots == null ? void 0 : slots.input) != null ? _slots$input : components.Input) != null ? _ref8 : "input";
  const rootSlotProps = (_slotProps$root = slotProps == null ? void 0 : slotProps.root) != null ? _slotProps$root : componentsProps.root;
  const railSlotProps = (_slotProps$rail = slotProps == null ? void 0 : slotProps.rail) != null ? _slotProps$rail : componentsProps.rail;
  const trackSlotProps = (_slotProps$track = slotProps == null ? void 0 : slotProps.track) != null ? _slotProps$track : componentsProps.track;
  const thumbSlotProps = (_slotProps$thumb = slotProps == null ? void 0 : slotProps.thumb) != null ? _slotProps$thumb : componentsProps.thumb;
  const valueLabelSlotProps = (_slotProps$valueLabel = slotProps == null ? void 0 : slotProps.valueLabel) != null ? _slotProps$valueLabel : componentsProps.valueLabel;
  const markSlotProps = (_slotProps$mark = slotProps == null ? void 0 : slotProps.mark) != null ? _slotProps$mark : componentsProps.mark;
  const markLabelSlotProps = (_slotProps$markLabel = slotProps == null ? void 0 : slotProps.markLabel) != null ? _slotProps$markLabel : componentsProps.markLabel;
  const inputSlotProps = (_slotProps$input = slotProps == null ? void 0 : slotProps.input) != null ? _slotProps$input : componentsProps.input;
  const rootProps = useSlotProps({
    elementType: RootSlot,
    getSlotProps: getRootProps,
    externalSlotProps: rootSlotProps,
    externalForwardedProps: other,
    additionalProps: _extends({}, shouldSpreadAdditionalProps(RootSlot) && {
      as: component
    }),
    ownerState: _extends({}, ownerState, rootSlotProps == null ? void 0 : rootSlotProps.ownerState),
    className: [classes.root, className]
  });
  const railProps = useSlotProps({
    elementType: RailSlot,
    externalSlotProps: railSlotProps,
    ownerState,
    className: classes.rail
  });
  const trackProps = useSlotProps({
    elementType: TrackSlot,
    externalSlotProps: trackSlotProps,
    additionalProps: {
      style: _extends({}, axisProps2[axis].offset(trackOffset), axisProps2[axis].leap(trackLeap))
    },
    ownerState: _extends({}, ownerState, trackSlotProps == null ? void 0 : trackSlotProps.ownerState),
    className: classes.track
  });
  const thumbProps = useSlotProps({
    elementType: ThumbSlot,
    getSlotProps: getThumbProps,
    externalSlotProps: thumbSlotProps,
    ownerState: _extends({}, ownerState, thumbSlotProps == null ? void 0 : thumbSlotProps.ownerState),
    className: classes.thumb
  });
  const valueLabelProps = useSlotProps({
    elementType: ValueLabelSlot,
    externalSlotProps: valueLabelSlotProps,
    ownerState: _extends({}, ownerState, valueLabelSlotProps == null ? void 0 : valueLabelSlotProps.ownerState),
    className: classes.valueLabel
  });
  const markProps = useSlotProps({
    elementType: MarkSlot,
    externalSlotProps: markSlotProps,
    ownerState,
    className: classes.mark
  });
  const markLabelProps = useSlotProps({
    elementType: MarkLabelSlot,
    externalSlotProps: markLabelSlotProps,
    ownerState,
    className: classes.markLabel
  });
  const inputSliderProps = useSlotProps({
    elementType: InputSlot,
    getSlotProps: getHiddenInputProps,
    externalSlotProps: inputSlotProps,
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(RootSlot, _extends({}, rootProps, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RailSlot, _extends({}, railProps)), /* @__PURE__ */ jsxRuntimeExports.jsx(TrackSlot, _extends({}, trackProps)), marks.filter((mark) => mark.value >= min && mark.value <= max).map((mark, index) => {
      const percent = valueToPercent(mark.value, min, max);
      const style2 = axisProps2[axis].offset(percent);
      let markActive;
      if (track === false) {
        markActive = values2.indexOf(mark.value) !== -1;
      } else {
        markActive = track === "normal" && (range ? mark.value >= values2[0] && mark.value <= values2[values2.length - 1] : mark.value <= values2[0]) || track === "inverted" && (range ? mark.value <= values2[0] || mark.value >= values2[values2.length - 1] : mark.value >= values2[0]);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(MarkSlot, _extends({
          "data-index": index
        }, markProps, !isHostComponent(MarkSlot) && {
          markActive
        }, {
          style: _extends({}, style2, markProps.style),
          className: clsx(markProps.className, markActive && classes.markActive)
        })), mark.label != null ? /* @__PURE__ */ jsxRuntimeExports.jsx(MarkLabelSlot, _extends({
          "aria-hidden": true,
          "data-index": index
        }, markLabelProps, !isHostComponent(MarkLabelSlot) && {
          markLabelActive: markActive
        }, {
          style: _extends({}, style2, markLabelProps.style),
          className: clsx(classes.markLabel, markLabelProps.className, markActive && classes.markLabelActive),
          children: mark.label
        })) : null]
      }, index);
    }), values2.map((value, index) => {
      const percent = valueToPercent(value, min, max);
      const style2 = axisProps2[axis].offset(percent);
      const ValueLabelComponent = valueLabelDisplay === "off" ? Forward : ValueLabelSlot;
      return (
        /* TODO v6: Change component structure. It will help in avoiding the complicated React.cloneElement API added in SliderValueLabel component. Should be: Thumb -> Input, ValueLabel. Follow Joy UI's Slider structure. */
        /* @__PURE__ */ jsxRuntimeExports.jsx(ValueLabelComponent, _extends({}, !isHostComponent(ValueLabelComponent) && {
          valueLabelFormat,
          valueLabelDisplay,
          value: typeof valueLabelFormat === "function" ? valueLabelFormat(scale(value), index) : valueLabelFormat,
          index,
          open: open === index || active === index || valueLabelDisplay === "on",
          disabled
        }, valueLabelProps, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbSlot, _extends({
            "data-index": index
          }, thumbProps, {
            className: clsx(classes.thumb, thumbProps.className, active === index && classes.active, focusedThumbIndex === index && classes.focusVisible),
            style: _extends({}, style2, getThumbStyle(index), thumbProps.style),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(InputSlot, _extends({
              "data-index": index,
              "aria-label": getAriaLabel ? getAriaLabel(index) : ariaLabel,
              "aria-valuenow": scale(value),
              "aria-labelledby": ariaLabelledby,
              "aria-valuetext": getAriaValueText ? getAriaValueText(scale(value), index) : ariaValuetext,
              value: values2[index]
            }, inputSliderProps))
          }))
        }), index)
      );
    })]
  }));
});
function getSnackbarContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiSnackbarContent", slot);
}
generateUtilityClasses("MuiSnackbarContent", ["root", "message", "action"]);
const _excluded$v = ["action", "className", "message", "role"];
const useUtilityClasses$t = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    action: ["action"],
    message: ["message"]
  };
  return composeClasses(slots, getSnackbarContentUtilityClass, classes);
};
const SnackbarContentRoot = styled(Paper, {
  name: "MuiSnackbarContent",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => {
  const emphasis = theme.palette.mode === "light" ? 0.8 : 0.98;
  const backgroundColor2 = emphasize_1(theme.palette.background.default, emphasis);
  return _extends({}, theme.typography.body2, {
    color: theme.vars ? theme.vars.palette.SnackbarContent.color : theme.palette.getContrastText(backgroundColor2),
    backgroundColor: theme.vars ? theme.vars.palette.SnackbarContent.bg : backgroundColor2,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "6px 16px",
    borderRadius: (theme.vars || theme).shape.borderRadius,
    flexGrow: 1,
    [theme.breakpoints.up("sm")]: {
      flexGrow: "initial",
      minWidth: 288
    }
  });
});
const SnackbarContentMessage = styled("div", {
  name: "MuiSnackbarContent",
  slot: "Message",
  overridesResolver: (props, styles2) => styles2.message
})({
  padding: "8px 0"
});
const SnackbarContentAction = styled("div", {
  name: "MuiSnackbarContent",
  slot: "Action",
  overridesResolver: (props, styles2) => styles2.action
})({
  display: "flex",
  alignItems: "center",
  marginLeft: "auto",
  paddingLeft: 16,
  marginRight: -8
});
const SnackbarContent = /* @__PURE__ */ reactExports.forwardRef(function SnackbarContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiSnackbarContent"
  });
  const {
    action,
    className,
    message,
    role = "alert"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$v);
  const ownerState = props;
  const classes = useUtilityClasses$t(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SnackbarContentRoot, _extends({
    role,
    square: true,
    elevation: 6,
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SnackbarContentMessage, {
      className: classes.message,
      ownerState,
      children: message
    }), action ? /* @__PURE__ */ jsxRuntimeExports.jsx(SnackbarContentAction, {
      className: classes.action,
      ownerState,
      children: action
    }) : null]
  }));
});
function getSnackbarUtilityClass(slot) {
  return generateUtilityClass$2("MuiSnackbar", slot);
}
generateUtilityClasses("MuiSnackbar", ["root", "anchorOriginTopCenter", "anchorOriginBottomCenter", "anchorOriginTopRight", "anchorOriginBottomRight", "anchorOriginTopLeft", "anchorOriginBottomLeft"]);
const _excluded$u = ["onEnter", "onExited"], _excluded2$2 = ["action", "anchorOrigin", "autoHideDuration", "children", "className", "ClickAwayListenerProps", "ContentProps", "disableWindowBlurListener", "message", "onBlur", "onClose", "onFocus", "onMouseEnter", "onMouseLeave", "open", "resumeHideDuration", "TransitionComponent", "transitionDuration", "TransitionProps"];
const useUtilityClasses$s = (ownerState) => {
  const {
    classes,
    anchorOrigin
  } = ownerState;
  const slots = {
    root: ["root", `anchorOrigin${capitalize$1(anchorOrigin.vertical)}${capitalize$1(anchorOrigin.horizontal)}`]
  };
  return composeClasses(slots, getSnackbarUtilityClass, classes);
};
const SnackbarRoot = styled("div", {
  name: "MuiSnackbar",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`anchorOrigin${capitalize$1(ownerState.anchorOrigin.vertical)}${capitalize$1(ownerState.anchorOrigin.horizontal)}`]];
  }
})(({
  theme,
  ownerState
}) => {
  const center = {
    left: "50%",
    right: "auto",
    transform: "translateX(-50%)"
  };
  return _extends({
    zIndex: (theme.vars || theme).zIndex.snackbar,
    position: "fixed",
    display: "flex",
    left: 8,
    right: 8,
    justifyContent: "center",
    alignItems: "center"
  }, ownerState.anchorOrigin.vertical === "top" ? {
    top: 8
  } : {
    bottom: 8
  }, ownerState.anchorOrigin.horizontal === "left" && {
    justifyContent: "flex-start"
  }, ownerState.anchorOrigin.horizontal === "right" && {
    justifyContent: "flex-end"
  }, {
    [theme.breakpoints.up("sm")]: _extends({}, ownerState.anchorOrigin.vertical === "top" ? {
      top: 24
    } : {
      bottom: 24
    }, ownerState.anchorOrigin.horizontal === "center" && center, ownerState.anchorOrigin.horizontal === "left" && {
      left: 24,
      right: "auto"
    }, ownerState.anchorOrigin.horizontal === "right" && {
      right: 24,
      left: "auto"
    })
  });
});
const Snackbar = /* @__PURE__ */ reactExports.forwardRef(function Snackbar2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiSnackbar"
  });
  const theme = useTheme$1();
  const defaultTransitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    action,
    anchorOrigin: {
      vertical,
      horizontal
    } = {
      vertical: "bottom",
      horizontal: "left"
    },
    autoHideDuration = null,
    children,
    className,
    ClickAwayListenerProps,
    ContentProps,
    disableWindowBlurListener = false,
    message,
    open,
    TransitionComponent = Grow,
    transitionDuration = defaultTransitionDuration,
    TransitionProps: {
      onEnter,
      onExited
    } = {}
  } = props, TransitionProps = _objectWithoutPropertiesLoose(props.TransitionProps, _excluded$u), other = _objectWithoutPropertiesLoose(props, _excluded2$2);
  const ownerState = _extends({}, props, {
    anchorOrigin: {
      vertical,
      horizontal
    },
    autoHideDuration,
    disableWindowBlurListener,
    TransitionComponent,
    transitionDuration
  });
  const classes = useUtilityClasses$s(ownerState);
  const {
    getRootProps,
    onClickAway
  } = useSnackbar(_extends({}, ownerState));
  const [exited, setExited] = reactExports.useState(true);
  const rootProps = useSlotProps({
    elementType: SnackbarRoot,
    getSlotProps: getRootProps,
    externalForwardedProps: other,
    ownerState,
    additionalProps: {
      ref
    },
    className: [classes.root, className]
  });
  const handleExited = (node) => {
    setExited(true);
    if (onExited) {
      onExited(node);
    }
  };
  const handleEnter = (node, isAppearing) => {
    setExited(false);
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  };
  if (!open && exited) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ClickAwayListener, _extends({
    onClickAway
  }, ClickAwayListenerProps, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SnackbarRoot, _extends({}, rootProps, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
        appear: true,
        in: open,
        timeout: transitionDuration,
        direction: vertical === "top" ? "down" : "up",
        onEnter: handleEnter,
        onExited: handleExited
      }, TransitionProps, {
        children: children || /* @__PURE__ */ jsxRuntimeExports.jsx(SnackbarContent, _extends({
          message,
          action
        }, ContentProps))
      }))
    }))
  }));
});
const _excluded$t = ["addEndListener", "appear", "children", "easing", "in", "onEnter", "onEntered", "onEntering", "onExit", "onExited", "onExiting", "style", "timeout", "TransitionComponent"];
const styles = {
  entering: {
    transform: "none"
  },
  entered: {
    transform: "none"
  }
};
const Zoom = /* @__PURE__ */ reactExports.forwardRef(function Zoom2(props, ref) {
  const theme = useTheme$1();
  const defaultTimeout = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  };
  const {
    addEndListener,
    appear = true,
    children,
    easing: easing2,
    in: inProp,
    onEnter,
    onEntered,
    onEntering,
    onExit,
    onExited,
    onExiting,
    style: style2,
    timeout = defaultTimeout,
    // eslint-disable-next-line react/prop-types
    TransitionComponent = Transition
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$t);
  const nodeRef = reactExports.useRef(null);
  const handleRef = useForkRef(nodeRef, children.ref, ref);
  const normalizedTransitionCallback = (callback) => (maybeIsAppearing) => {
    if (callback) {
      const node = nodeRef.current;
      if (maybeIsAppearing === void 0) {
        callback(node);
      } else {
        callback(node, maybeIsAppearing);
      }
    }
  };
  const handleEntering = normalizedTransitionCallback(onEntering);
  const handleEnter = normalizedTransitionCallback((node, isAppearing) => {
    reflow(node);
    const transitionProps = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "enter"
    });
    node.style.webkitTransition = theme.transitions.create("transform", transitionProps);
    node.style.transition = theme.transitions.create("transform", transitionProps);
    if (onEnter) {
      onEnter(node, isAppearing);
    }
  });
  const handleEntered = normalizedTransitionCallback(onEntered);
  const handleExiting = normalizedTransitionCallback(onExiting);
  const handleExit = normalizedTransitionCallback((node) => {
    const transitionProps = getTransitionProps({
      style: style2,
      timeout,
      easing: easing2
    }, {
      mode: "exit"
    });
    node.style.webkitTransition = theme.transitions.create("transform", transitionProps);
    node.style.transition = theme.transitions.create("transform", transitionProps);
    if (onExit) {
      onExit(node);
    }
  });
  const handleExited = normalizedTransitionCallback(onExited);
  const handleAddEndListener = (next2) => {
    if (addEndListener) {
      addEndListener(nodeRef.current, next2);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
    appear,
    in: inProp,
    nodeRef,
    onEnter: handleEnter,
    onEntered: handleEntered,
    onEntering: handleEntering,
    onExit: handleExit,
    onExited: handleExited,
    onExiting: handleExiting,
    addEndListener: handleAddEndListener,
    timeout
  }, other, {
    children: (state, childProps) => {
      return /* @__PURE__ */ reactExports.cloneElement(children, _extends({
        style: _extends({
          transform: "scale(0)",
          visibility: state === "exited" && !inProp ? "hidden" : void 0
        }, styles[state], style2, children.props.style),
        ref: handleRef
      }, childProps));
    }
  }));
});
function getTooltipUtilityClass(slot) {
  return generateUtilityClass$2("MuiTooltip", slot);
}
const tooltipClasses = generateUtilityClasses("MuiTooltip", ["popper", "popperInteractive", "popperArrow", "popperClose", "tooltip", "tooltipArrow", "touch", "tooltipPlacementLeft", "tooltipPlacementRight", "tooltipPlacementTop", "tooltipPlacementBottom", "arrow"]);
const _excluded$s = ["arrow", "children", "classes", "components", "componentsProps", "describeChild", "disableFocusListener", "disableHoverListener", "disableInteractive", "disableTouchListener", "enterDelay", "enterNextDelay", "enterTouchDelay", "followCursor", "id", "leaveDelay", "leaveTouchDelay", "onClose", "onOpen", "open", "placement", "PopperComponent", "PopperProps", "slotProps", "slots", "title", "TransitionComponent", "TransitionProps"];
function round(value) {
  return Math.round(value * 1e5) / 1e5;
}
const useUtilityClasses$r = (ownerState) => {
  const {
    classes,
    disableInteractive,
    arrow,
    touch,
    placement
  } = ownerState;
  const slots = {
    popper: ["popper", !disableInteractive && "popperInteractive", arrow && "popperArrow"],
    tooltip: ["tooltip", arrow && "tooltipArrow", touch && "touch", `tooltipPlacement${capitalize$1(placement.split("-")[0])}`],
    arrow: ["arrow"]
  };
  return composeClasses(slots, getTooltipUtilityClass, classes);
};
const TooltipPopper = styled(Popper$1, {
  name: "MuiTooltip",
  slot: "Popper",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.popper, !ownerState.disableInteractive && styles2.popperInteractive, ownerState.arrow && styles2.popperArrow, !ownerState.open && styles2.popperClose];
  }
})(({
  theme,
  ownerState,
  open
}) => _extends({
  zIndex: (theme.vars || theme).zIndex.tooltip,
  pointerEvents: "none"
}, !ownerState.disableInteractive && {
  pointerEvents: "auto"
}, !open && {
  pointerEvents: "none"
}, ownerState.arrow && {
  [`&[data-popper-placement*="bottom"] .${tooltipClasses.arrow}`]: {
    top: 0,
    marginTop: "-0.71em",
    "&::before": {
      transformOrigin: "0 100%"
    }
  },
  [`&[data-popper-placement*="top"] .${tooltipClasses.arrow}`]: {
    bottom: 0,
    marginBottom: "-0.71em",
    "&::before": {
      transformOrigin: "100% 0"
    }
  },
  [`&[data-popper-placement*="right"] .${tooltipClasses.arrow}`]: _extends({}, !ownerState.isRtl ? {
    left: 0,
    marginLeft: "-0.71em"
  } : {
    right: 0,
    marginRight: "-0.71em"
  }, {
    height: "1em",
    width: "0.71em",
    "&::before": {
      transformOrigin: "100% 100%"
    }
  }),
  [`&[data-popper-placement*="left"] .${tooltipClasses.arrow}`]: _extends({}, !ownerState.isRtl ? {
    right: 0,
    marginRight: "-0.71em"
  } : {
    left: 0,
    marginLeft: "-0.71em"
  }, {
    height: "1em",
    width: "0.71em",
    "&::before": {
      transformOrigin: "0 0"
    }
  })
}));
const TooltipTooltip = styled("div", {
  name: "MuiTooltip",
  slot: "Tooltip",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.tooltip, ownerState.touch && styles2.touch, ownerState.arrow && styles2.tooltipArrow, styles2[`tooltipPlacement${capitalize$1(ownerState.placement.split("-")[0])}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  backgroundColor: theme.vars ? theme.vars.palette.Tooltip.bg : alpha_1(theme.palette.grey[700], 0.92),
  borderRadius: (theme.vars || theme).shape.borderRadius,
  color: (theme.vars || theme).palette.common.white,
  fontFamily: theme.typography.fontFamily,
  padding: "4px 8px",
  fontSize: theme.typography.pxToRem(11),
  maxWidth: 300,
  margin: 2,
  wordWrap: "break-word",
  fontWeight: theme.typography.fontWeightMedium
}, ownerState.arrow && {
  position: "relative",
  margin: 0
}, ownerState.touch && {
  padding: "8px 16px",
  fontSize: theme.typography.pxToRem(14),
  lineHeight: `${round(16 / 14)}em`,
  fontWeight: theme.typography.fontWeightRegular
}, {
  [`.${tooltipClasses.popper}[data-popper-placement*="left"] &`]: _extends({
    transformOrigin: "right center"
  }, !ownerState.isRtl ? _extends({
    marginRight: "14px"
  }, ownerState.touch && {
    marginRight: "24px"
  }) : _extends({
    marginLeft: "14px"
  }, ownerState.touch && {
    marginLeft: "24px"
  })),
  [`.${tooltipClasses.popper}[data-popper-placement*="right"] &`]: _extends({
    transformOrigin: "left center"
  }, !ownerState.isRtl ? _extends({
    marginLeft: "14px"
  }, ownerState.touch && {
    marginLeft: "24px"
  }) : _extends({
    marginRight: "14px"
  }, ownerState.touch && {
    marginRight: "24px"
  })),
  [`.${tooltipClasses.popper}[data-popper-placement*="top"] &`]: _extends({
    transformOrigin: "center bottom",
    marginBottom: "14px"
  }, ownerState.touch && {
    marginBottom: "24px"
  }),
  [`.${tooltipClasses.popper}[data-popper-placement*="bottom"] &`]: _extends({
    transformOrigin: "center top",
    marginTop: "14px"
  }, ownerState.touch && {
    marginTop: "24px"
  })
}));
const TooltipArrow = styled("span", {
  name: "MuiTooltip",
  slot: "Arrow",
  overridesResolver: (props, styles2) => styles2.arrow
})(({
  theme
}) => ({
  overflow: "hidden",
  position: "absolute",
  width: "1em",
  height: "0.71em",
  boxSizing: "border-box",
  color: theme.vars ? theme.vars.palette.Tooltip.bg : alpha_1(theme.palette.grey[700], 0.9),
  "&::before": {
    content: '""',
    margin: "auto",
    display: "block",
    width: "100%",
    height: "100%",
    backgroundColor: "currentColor",
    transform: "rotate(45deg)"
  }
}));
let hystersisOpen = false;
const hystersisTimer = new Timeout();
let cursorPosition = {
  x: 0,
  y: 0
};
function composeEventHandler(handler, eventHandler) {
  return (event, ...params) => {
    if (eventHandler) {
      eventHandler(event, ...params);
    }
    handler(event, ...params);
  };
}
const Tooltip = /* @__PURE__ */ reactExports.forwardRef(function Tooltip2(inProps, ref) {
  var _ref, _slots$popper, _ref2, _ref3, _slots$transition, _ref4, _slots$tooltip, _ref5, _slots$arrow, _slotProps$popper, _ref6, _slotProps$popper2, _slotProps$transition, _slotProps$tooltip, _ref7, _slotProps$tooltip2, _slotProps$arrow, _ref8, _slotProps$arrow2;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTooltip"
  });
  const {
    arrow = false,
    children: childrenProp,
    components = {},
    componentsProps = {},
    describeChild = false,
    disableFocusListener = false,
    disableHoverListener = false,
    disableInteractive: disableInteractiveProp = false,
    disableTouchListener = false,
    enterDelay = 100,
    enterNextDelay = 0,
    enterTouchDelay = 700,
    followCursor = false,
    id: idProp,
    leaveDelay = 0,
    leaveTouchDelay = 1500,
    onClose,
    onOpen,
    open: openProp,
    placement = "bottom",
    PopperComponent: PopperComponentProp,
    PopperProps = {},
    slotProps = {},
    slots = {},
    title,
    TransitionComponent: TransitionComponentProp = Grow,
    TransitionProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$s);
  const children = /* @__PURE__ */ reactExports.isValidElement(childrenProp) ? childrenProp : /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
    children: childrenProp
  });
  const theme = useTheme$1();
  const isRtl = useRtl();
  const [childNode, setChildNode] = reactExports.useState();
  const [arrowRef, setArrowRef] = reactExports.useState(null);
  const ignoreNonTouchEvents = reactExports.useRef(false);
  const disableInteractive = disableInteractiveProp || followCursor;
  const closeTimer = useTimeout();
  const enterTimer = useTimeout();
  const leaveTimer = useTimeout();
  const touchTimer = useTimeout();
  const [openState, setOpenState] = useControlled({
    controlled: openProp,
    default: false,
    name: "Tooltip",
    state: "open"
  });
  let open = openState;
  const id = useId(idProp);
  const prevUserSelect = reactExports.useRef();
  const stopTouchInteraction = useEventCallback(() => {
    if (prevUserSelect.current !== void 0) {
      document.body.style.WebkitUserSelect = prevUserSelect.current;
      prevUserSelect.current = void 0;
    }
    touchTimer.clear();
  });
  reactExports.useEffect(() => stopTouchInteraction, [stopTouchInteraction]);
  const handleOpen = (event) => {
    hystersisTimer.clear();
    hystersisOpen = true;
    setOpenState(true);
    if (onOpen && !open) {
      onOpen(event);
    }
  };
  const handleClose = useEventCallback(
    /**
     * @param {React.SyntheticEvent | Event} event
     */
    (event) => {
      hystersisTimer.start(800 + leaveDelay, () => {
        hystersisOpen = false;
      });
      setOpenState(false);
      if (onClose && open) {
        onClose(event);
      }
      closeTimer.start(theme.transitions.duration.shortest, () => {
        ignoreNonTouchEvents.current = false;
      });
    }
  );
  const handleMouseOver = (event) => {
    if (ignoreNonTouchEvents.current && event.type !== "touchstart") {
      return;
    }
    if (childNode) {
      childNode.removeAttribute("title");
    }
    enterTimer.clear();
    leaveTimer.clear();
    if (enterDelay || hystersisOpen && enterNextDelay) {
      enterTimer.start(hystersisOpen ? enterNextDelay : enterDelay, () => {
        handleOpen(event);
      });
    } else {
      handleOpen(event);
    }
  };
  const handleMouseLeave = (event) => {
    enterTimer.clear();
    leaveTimer.start(leaveDelay, () => {
      handleClose(event);
    });
  };
  const {
    isFocusVisibleRef,
    onBlur: handleBlurVisible,
    onFocus: handleFocusVisible,
    ref: focusVisibleRef
  } = useIsFocusVisible();
  const [, setChildIsFocusVisible] = reactExports.useState(false);
  const handleBlur = (event) => {
    handleBlurVisible(event);
    if (isFocusVisibleRef.current === false) {
      setChildIsFocusVisible(false);
      handleMouseLeave(event);
    }
  };
  const handleFocus = (event) => {
    if (!childNode) {
      setChildNode(event.currentTarget);
    }
    handleFocusVisible(event);
    if (isFocusVisibleRef.current === true) {
      setChildIsFocusVisible(true);
      handleMouseOver(event);
    }
  };
  const detectTouchStart = (event) => {
    ignoreNonTouchEvents.current = true;
    const childrenProps2 = children.props;
    if (childrenProps2.onTouchStart) {
      childrenProps2.onTouchStart(event);
    }
  };
  const handleTouchStart = (event) => {
    detectTouchStart(event);
    leaveTimer.clear();
    closeTimer.clear();
    stopTouchInteraction();
    prevUserSelect.current = document.body.style.WebkitUserSelect;
    document.body.style.WebkitUserSelect = "none";
    touchTimer.start(enterTouchDelay, () => {
      document.body.style.WebkitUserSelect = prevUserSelect.current;
      handleMouseOver(event);
    });
  };
  const handleTouchEnd = (event) => {
    if (children.props.onTouchEnd) {
      children.props.onTouchEnd(event);
    }
    stopTouchInteraction();
    leaveTimer.start(leaveTouchDelay, () => {
      handleClose(event);
    });
  };
  reactExports.useEffect(() => {
    if (!open) {
      return void 0;
    }
    function handleKeyDown2(nativeEvent) {
      if (nativeEvent.key === "Escape" || nativeEvent.key === "Esc") {
        handleClose(nativeEvent);
      }
    }
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("keydown", handleKeyDown2);
    };
  }, [handleClose, open]);
  const handleRef = useForkRef(children.ref, focusVisibleRef, setChildNode, ref);
  if (!title && title !== 0) {
    open = false;
  }
  const popperRef = reactExports.useRef();
  const handleMouseMove = (event) => {
    const childrenProps2 = children.props;
    if (childrenProps2.onMouseMove) {
      childrenProps2.onMouseMove(event);
    }
    cursorPosition = {
      x: event.clientX,
      y: event.clientY
    };
    if (popperRef.current) {
      popperRef.current.update();
    }
  };
  const nameOrDescProps = {};
  const titleIsString = typeof title === "string";
  if (describeChild) {
    nameOrDescProps.title = !open && titleIsString && !disableHoverListener ? title : null;
    nameOrDescProps["aria-describedby"] = open ? id : null;
  } else {
    nameOrDescProps["aria-label"] = titleIsString ? title : null;
    nameOrDescProps["aria-labelledby"] = open && !titleIsString ? id : null;
  }
  const childrenProps = _extends({}, nameOrDescProps, other, children.props, {
    className: clsx(other.className, children.props.className),
    onTouchStart: detectTouchStart,
    ref: handleRef
  }, followCursor ? {
    onMouseMove: handleMouseMove
  } : {});
  const interactiveWrapperListeners = {};
  if (!disableTouchListener) {
    childrenProps.onTouchStart = handleTouchStart;
    childrenProps.onTouchEnd = handleTouchEnd;
  }
  if (!disableHoverListener) {
    childrenProps.onMouseOver = composeEventHandler(handleMouseOver, childrenProps.onMouseOver);
    childrenProps.onMouseLeave = composeEventHandler(handleMouseLeave, childrenProps.onMouseLeave);
    if (!disableInteractive) {
      interactiveWrapperListeners.onMouseOver = handleMouseOver;
      interactiveWrapperListeners.onMouseLeave = handleMouseLeave;
    }
  }
  if (!disableFocusListener) {
    childrenProps.onFocus = composeEventHandler(handleFocus, childrenProps.onFocus);
    childrenProps.onBlur = composeEventHandler(handleBlur, childrenProps.onBlur);
    if (!disableInteractive) {
      interactiveWrapperListeners.onFocus = handleFocus;
      interactiveWrapperListeners.onBlur = handleBlur;
    }
  }
  const popperOptions = reactExports.useMemo(() => {
    var _PopperProps$popperOp;
    let tooltipModifiers = [{
      name: "arrow",
      enabled: Boolean(arrowRef),
      options: {
        element: arrowRef,
        padding: 4
      }
    }];
    if ((_PopperProps$popperOp = PopperProps.popperOptions) != null && _PopperProps$popperOp.modifiers) {
      tooltipModifiers = tooltipModifiers.concat(PopperProps.popperOptions.modifiers);
    }
    return _extends({}, PopperProps.popperOptions, {
      modifiers: tooltipModifiers
    });
  }, [arrowRef, PopperProps]);
  const ownerState = _extends({}, props, {
    isRtl,
    arrow,
    disableInteractive,
    placement,
    PopperComponentProp,
    touch: ignoreNonTouchEvents.current
  });
  const classes = useUtilityClasses$r(ownerState);
  const PopperComponent = (_ref = (_slots$popper = slots.popper) != null ? _slots$popper : components.Popper) != null ? _ref : TooltipPopper;
  const TransitionComponent = (_ref2 = (_ref3 = (_slots$transition = slots.transition) != null ? _slots$transition : components.Transition) != null ? _ref3 : TransitionComponentProp) != null ? _ref2 : Grow;
  const TooltipComponent = (_ref4 = (_slots$tooltip = slots.tooltip) != null ? _slots$tooltip : components.Tooltip) != null ? _ref4 : TooltipTooltip;
  const ArrowComponent = (_ref5 = (_slots$arrow = slots.arrow) != null ? _slots$arrow : components.Arrow) != null ? _ref5 : TooltipArrow;
  const popperProps = appendOwnerState(PopperComponent, _extends({}, PopperProps, (_slotProps$popper = slotProps.popper) != null ? _slotProps$popper : componentsProps.popper, {
    className: clsx(classes.popper, PopperProps == null ? void 0 : PopperProps.className, (_ref6 = (_slotProps$popper2 = slotProps.popper) != null ? _slotProps$popper2 : componentsProps.popper) == null ? void 0 : _ref6.className)
  }), ownerState);
  const transitionProps = appendOwnerState(TransitionComponent, _extends({}, TransitionProps, (_slotProps$transition = slotProps.transition) != null ? _slotProps$transition : componentsProps.transition), ownerState);
  const tooltipProps = appendOwnerState(TooltipComponent, _extends({}, (_slotProps$tooltip = slotProps.tooltip) != null ? _slotProps$tooltip : componentsProps.tooltip, {
    className: clsx(classes.tooltip, (_ref7 = (_slotProps$tooltip2 = slotProps.tooltip) != null ? _slotProps$tooltip2 : componentsProps.tooltip) == null ? void 0 : _ref7.className)
  }), ownerState);
  const tooltipArrowProps = appendOwnerState(ArrowComponent, _extends({}, (_slotProps$arrow = slotProps.arrow) != null ? _slotProps$arrow : componentsProps.arrow, {
    className: clsx(classes.arrow, (_ref8 = (_slotProps$arrow2 = slotProps.arrow) != null ? _slotProps$arrow2 : componentsProps.arrow) == null ? void 0 : _ref8.className)
  }), ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [/* @__PURE__ */ reactExports.cloneElement(children, childrenProps), /* @__PURE__ */ jsxRuntimeExports.jsx(PopperComponent, _extends({
      as: PopperComponentProp != null ? PopperComponentProp : Popper$1,
      placement,
      anchorEl: followCursor ? {
        getBoundingClientRect: () => ({
          top: cursorPosition.y,
          left: cursorPosition.x,
          right: cursorPosition.x,
          bottom: cursorPosition.y,
          width: 0,
          height: 0
        })
      } : childNode,
      popperRef,
      open: childNode ? open : false,
      id,
      transition: true
    }, interactiveWrapperListeners, popperProps, {
      popperOptions,
      children: ({
        TransitionProps: TransitionPropsInner
      }) => /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionComponent, _extends({
        timeout: theme.transitions.duration.shorter
      }, TransitionPropsInner, transitionProps, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TooltipComponent, _extends({}, tooltipProps, {
          children: [title, arrow ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowComponent, _extends({}, tooltipArrowProps, {
            ref: setArrowRef
          })) : null]
        }))
      }))
    }))]
  });
});
const StepperContext = /* @__PURE__ */ reactExports.createContext({});
const StepContext = /* @__PURE__ */ reactExports.createContext({});
function getStepUtilityClass(slot) {
  return generateUtilityClass$2("MuiStep", slot);
}
generateUtilityClasses("MuiStep", ["root", "horizontal", "vertical", "alternativeLabel", "completed"]);
const _excluded$r = ["active", "children", "className", "component", "completed", "disabled", "expanded", "index", "last"];
const useUtilityClasses$q = (ownerState) => {
  const {
    classes,
    orientation,
    alternativeLabel,
    completed
  } = ownerState;
  const slots = {
    root: ["root", orientation, alternativeLabel && "alternativeLabel", completed && "completed"]
  };
  return composeClasses(slots, getStepUtilityClass, classes);
};
const StepRoot = styled("div", {
  name: "MuiStep",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.orientation], ownerState.alternativeLabel && styles2.alternativeLabel, ownerState.completed && styles2.completed];
  }
})(({
  ownerState
}) => _extends({}, ownerState.orientation === "horizontal" && {
  paddingLeft: 8,
  paddingRight: 8
}, ownerState.alternativeLabel && {
  flex: 1,
  position: "relative"
}));
const Step = /* @__PURE__ */ reactExports.forwardRef(function Step2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStep"
  });
  const {
    active: activeProp,
    children,
    className,
    component = "div",
    completed: completedProp,
    disabled: disabledProp,
    expanded = false,
    index,
    last
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$r);
  const {
    activeStep,
    connector,
    alternativeLabel,
    orientation,
    nonLinear
  } = reactExports.useContext(StepperContext);
  let [active = false, completed = false, disabled = false] = [activeProp, completedProp, disabledProp];
  if (activeStep === index) {
    active = activeProp !== void 0 ? activeProp : true;
  } else if (!nonLinear && activeStep > index) {
    completed = completedProp !== void 0 ? completedProp : true;
  } else if (!nonLinear && activeStep < index) {
    disabled = disabledProp !== void 0 ? disabledProp : true;
  }
  const contextValue = reactExports.useMemo(() => ({
    index,
    last,
    expanded,
    icon: index + 1,
    active,
    completed,
    disabled
  }), [index, last, expanded, active, completed, disabled]);
  const ownerState = _extends({}, props, {
    active,
    orientation,
    alternativeLabel,
    completed,
    disabled,
    expanded,
    component
  });
  const classes = useUtilityClasses$q(ownerState);
  const newChildren = /* @__PURE__ */ jsxRuntimeExports.jsxs(StepRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: [connector && alternativeLabel && index !== 0 ? connector : null, children]
  }));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StepContext.Provider, {
    value: contextValue,
    children: connector && !alternativeLabel && index !== 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
      children: [connector, newChildren]
    }) : newChildren
  });
});
const CheckCircle$2 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"
}), "CheckCircle");
const Warning$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
}), "Warning");
function getStepIconUtilityClass(slot) {
  return generateUtilityClass$2("MuiStepIcon", slot);
}
const stepIconClasses = generateUtilityClasses("MuiStepIcon", ["root", "active", "completed", "error", "text"]);
var _circle;
const _excluded$q = ["active", "className", "completed", "error", "icon"];
const useUtilityClasses$p = (ownerState) => {
  const {
    classes,
    active,
    completed,
    error
  } = ownerState;
  const slots = {
    root: ["root", active && "active", completed && "completed", error && "error"],
    text: ["text"]
  };
  return composeClasses(slots, getStepIconUtilityClass, classes);
};
const StepIconRoot = styled(SvgIcon, {
  name: "MuiStepIcon",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => ({
  display: "block",
  transition: theme.transitions.create("color", {
    duration: theme.transitions.duration.shortest
  }),
  color: (theme.vars || theme).palette.text.disabled,
  [`&.${stepIconClasses.completed}`]: {
    color: (theme.vars || theme).palette.primary.main
  },
  [`&.${stepIconClasses.active}`]: {
    color: (theme.vars || theme).palette.primary.main
  },
  [`&.${stepIconClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}));
const StepIconText = styled("text", {
  name: "MuiStepIcon",
  slot: "Text",
  overridesResolver: (props, styles2) => styles2.text
})(({
  theme
}) => ({
  fill: (theme.vars || theme).palette.primary.contrastText,
  fontSize: theme.typography.caption.fontSize,
  fontFamily: theme.typography.fontFamily
}));
const StepIcon = /* @__PURE__ */ reactExports.forwardRef(function StepIcon2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStepIcon"
  });
  const {
    active = false,
    className: classNameProp,
    completed = false,
    error = false,
    icon
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$q);
  const ownerState = _extends({}, props, {
    active,
    completed,
    error
  });
  const classes = useUtilityClasses$p(ownerState);
  if (typeof icon === "number" || typeof icon === "string") {
    const className = clsx(classNameProp, classes.root);
    if (error) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(StepIconRoot, _extends({
        as: Warning$1,
        className,
        ref,
        ownerState
      }, other));
    }
    if (completed) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(StepIconRoot, _extends({
        as: CheckCircle$2,
        className,
        ref,
        ownerState
      }, other));
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(StepIconRoot, _extends({
      className,
      ref,
      ownerState
    }, other, {
      children: [_circle || (_circle = /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
        cx: "12",
        cy: "12",
        r: "12"
      })), /* @__PURE__ */ jsxRuntimeExports.jsx(StepIconText, {
        className: classes.text,
        x: "12",
        y: "12",
        textAnchor: "middle",
        dominantBaseline: "central",
        ownerState,
        children: icon
      })]
    }));
  }
  return icon;
});
function getStepLabelUtilityClass(slot) {
  return generateUtilityClass$2("MuiStepLabel", slot);
}
const stepLabelClasses = generateUtilityClasses("MuiStepLabel", ["root", "horizontal", "vertical", "label", "active", "completed", "error", "disabled", "iconContainer", "alternativeLabel", "labelContainer"]);
const _excluded$p = ["children", "className", "componentsProps", "error", "icon", "optional", "slotProps", "StepIconComponent", "StepIconProps"];
const useUtilityClasses$o = (ownerState) => {
  const {
    classes,
    orientation,
    active,
    completed,
    error,
    disabled,
    alternativeLabel
  } = ownerState;
  const slots = {
    root: ["root", orientation, error && "error", disabled && "disabled", alternativeLabel && "alternativeLabel"],
    label: ["label", active && "active", completed && "completed", error && "error", disabled && "disabled", alternativeLabel && "alternativeLabel"],
    iconContainer: ["iconContainer", active && "active", completed && "completed", error && "error", disabled && "disabled", alternativeLabel && "alternativeLabel"],
    labelContainer: ["labelContainer", alternativeLabel && "alternativeLabel"]
  };
  return composeClasses(slots, getStepLabelUtilityClass, classes);
};
const StepLabelRoot = styled("span", {
  name: "MuiStepLabel",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.orientation]];
  }
})(({
  ownerState
}) => _extends({
  display: "flex",
  alignItems: "center",
  [`&.${stepLabelClasses.alternativeLabel}`]: {
    flexDirection: "column"
  },
  [`&.${stepLabelClasses.disabled}`]: {
    cursor: "default"
  }
}, ownerState.orientation === "vertical" && {
  textAlign: "left",
  padding: "8px 0"
}));
const StepLabelLabel = styled("span", {
  name: "MuiStepLabel",
  slot: "Label",
  overridesResolver: (props, styles2) => styles2.label
})(({
  theme
}) => _extends({}, theme.typography.body2, {
  display: "block",
  transition: theme.transitions.create("color", {
    duration: theme.transitions.duration.shortest
  }),
  [`&.${stepLabelClasses.active}`]: {
    color: (theme.vars || theme).palette.text.primary,
    fontWeight: 500
  },
  [`&.${stepLabelClasses.completed}`]: {
    color: (theme.vars || theme).palette.text.primary,
    fontWeight: 500
  },
  [`&.${stepLabelClasses.alternativeLabel}`]: {
    marginTop: 16
  },
  [`&.${stepLabelClasses.error}`]: {
    color: (theme.vars || theme).palette.error.main
  }
}));
const StepLabelIconContainer = styled("span", {
  name: "MuiStepLabel",
  slot: "IconContainer",
  overridesResolver: (props, styles2) => styles2.iconContainer
})(() => ({
  flexShrink: 0,
  // Fix IE11 issue
  display: "flex",
  paddingRight: 8,
  [`&.${stepLabelClasses.alternativeLabel}`]: {
    paddingRight: 0
  }
}));
const StepLabelLabelContainer = styled("span", {
  name: "MuiStepLabel",
  slot: "LabelContainer",
  overridesResolver: (props, styles2) => styles2.labelContainer
})(({
  theme
}) => ({
  width: "100%",
  color: (theme.vars || theme).palette.text.secondary,
  [`&.${stepLabelClasses.alternativeLabel}`]: {
    textAlign: "center"
  }
}));
const StepLabel = /* @__PURE__ */ reactExports.forwardRef(function StepLabel2(inProps, ref) {
  var _slotProps$label;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStepLabel"
  });
  const {
    children,
    className,
    componentsProps = {},
    error = false,
    icon: iconProp,
    optional,
    slotProps = {},
    StepIconComponent: StepIconComponentProp,
    StepIconProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$p);
  const {
    alternativeLabel,
    orientation
  } = reactExports.useContext(StepperContext);
  const {
    active,
    disabled,
    completed,
    icon: iconContext
  } = reactExports.useContext(StepContext);
  const icon = iconProp || iconContext;
  let StepIconComponent = StepIconComponentProp;
  if (icon && !StepIconComponent) {
    StepIconComponent = StepIcon;
  }
  const ownerState = _extends({}, props, {
    active,
    alternativeLabel,
    completed,
    disabled,
    error,
    orientation
  });
  const classes = useUtilityClasses$o(ownerState);
  const labelSlotProps = (_slotProps$label = slotProps.label) != null ? _slotProps$label : componentsProps.label;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(StepLabelRoot, _extends({
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: [icon || StepIconComponent ? /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabelIconContainer, {
      className: classes.iconContainer,
      ownerState,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepIconComponent, _extends({
        completed,
        active,
        error,
        icon
      }, StepIconProps))
    }) : null, /* @__PURE__ */ jsxRuntimeExports.jsxs(StepLabelLabelContainer, {
      className: classes.labelContainer,
      ownerState,
      children: [children ? /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabelLabel, _extends({
        ownerState
      }, labelSlotProps, {
        className: clsx(classes.label, labelSlotProps == null ? void 0 : labelSlotProps.className),
        children
      })) : null, optional]
    })]
  }));
});
StepLabel.muiName = "StepLabel";
function getStepConnectorUtilityClass(slot) {
  return generateUtilityClass$2("MuiStepConnector", slot);
}
generateUtilityClasses("MuiStepConnector", ["root", "horizontal", "vertical", "alternativeLabel", "active", "completed", "disabled", "line", "lineHorizontal", "lineVertical"]);
const _excluded$o = ["className"];
const useUtilityClasses$n = (ownerState) => {
  const {
    classes,
    orientation,
    alternativeLabel,
    active,
    completed,
    disabled
  } = ownerState;
  const slots = {
    root: ["root", orientation, alternativeLabel && "alternativeLabel", active && "active", completed && "completed", disabled && "disabled"],
    line: ["line", `line${capitalize$1(orientation)}`]
  };
  return composeClasses(slots, getStepConnectorUtilityClass, classes);
};
const StepConnectorRoot = styled("div", {
  name: "MuiStepConnector",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.orientation], ownerState.alternativeLabel && styles2.alternativeLabel, ownerState.completed && styles2.completed];
  }
})(({
  ownerState
}) => _extends({
  flex: "1 1 auto"
}, ownerState.orientation === "vertical" && {
  marginLeft: 12
  // half icon
}, ownerState.alternativeLabel && {
  position: "absolute",
  top: 8 + 4,
  left: "calc(-50% + 20px)",
  right: "calc(50% + 20px)"
}));
const StepConnectorLine = styled("span", {
  name: "MuiStepConnector",
  slot: "Line",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.line, styles2[`line${capitalize$1(ownerState.orientation)}`]];
  }
})(({
  ownerState,
  theme
}) => {
  const borderColor2 = theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[600];
  return _extends({
    display: "block",
    borderColor: theme.vars ? theme.vars.palette.StepConnector.border : borderColor2
  }, ownerState.orientation === "horizontal" && {
    borderTopStyle: "solid",
    borderTopWidth: 1
  }, ownerState.orientation === "vertical" && {
    borderLeftStyle: "solid",
    borderLeftWidth: 1,
    minHeight: 24
  });
});
const StepConnector = /* @__PURE__ */ reactExports.forwardRef(function StepConnector2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStepConnector"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$o);
  const {
    alternativeLabel,
    orientation = "horizontal"
  } = reactExports.useContext(StepperContext);
  const {
    active,
    disabled,
    completed
  } = reactExports.useContext(StepContext);
  const ownerState = _extends({}, props, {
    alternativeLabel,
    orientation,
    active,
    completed,
    disabled
  });
  const classes = useUtilityClasses$n(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StepConnectorRoot, _extends({
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepConnectorLine, {
      className: classes.line,
      ownerState
    })
  }));
});
function getStepContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiStepContent", slot);
}
generateUtilityClasses("MuiStepContent", ["root", "last", "transition"]);
const _excluded$n = ["children", "className", "TransitionComponent", "transitionDuration", "TransitionProps"];
const useUtilityClasses$m = (ownerState) => {
  const {
    classes,
    last
  } = ownerState;
  const slots = {
    root: ["root", last && "last"],
    transition: ["transition"]
  };
  return composeClasses(slots, getStepContentUtilityClass, classes);
};
const StepContentRoot = styled("div", {
  name: "MuiStepContent",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.last && styles2.last];
  }
})(({
  ownerState,
  theme
}) => _extends({
  marginLeft: 12,
  // half icon
  paddingLeft: 8 + 12,
  // margin + half icon
  paddingRight: 8,
  borderLeft: theme.vars ? `1px solid ${theme.vars.palette.StepContent.border}` : `1px solid ${theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[600]}`
}, ownerState.last && {
  borderLeft: "none"
}));
const StepContentTransition = styled(Collapse, {
  name: "MuiStepContent",
  slot: "Transition",
  overridesResolver: (props, styles2) => styles2.transition
})({});
const StepContent = /* @__PURE__ */ reactExports.forwardRef(function StepContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStepContent"
  });
  const {
    children,
    className,
    TransitionComponent = Collapse,
    transitionDuration: transitionDurationProp = "auto",
    TransitionProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$n);
  const {
    orientation
  } = reactExports.useContext(StepperContext);
  const {
    active,
    last,
    expanded
  } = reactExports.useContext(StepContext);
  const ownerState = _extends({}, props, {
    last
  });
  const classes = useUtilityClasses$m(ownerState);
  let transitionDuration = transitionDurationProp;
  if (transitionDurationProp === "auto" && !TransitionComponent.muiSupportAuto) {
    transitionDuration = void 0;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StepContentRoot, _extends({
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepContentTransition, _extends({
      as: TransitionComponent,
      in: active || expanded,
      className: classes.transition,
      ownerState,
      timeout: transitionDuration,
      unmountOnExit: true
    }, TransitionProps, {
      children
    }))
  }));
});
function getStepperUtilityClass(slot) {
  return generateUtilityClass$2("MuiStepper", slot);
}
generateUtilityClasses("MuiStepper", ["root", "horizontal", "vertical", "alternativeLabel"]);
const _excluded$m = ["activeStep", "alternativeLabel", "children", "className", "component", "connector", "nonLinear", "orientation"];
const useUtilityClasses$l = (ownerState) => {
  const {
    orientation,
    alternativeLabel,
    classes
  } = ownerState;
  const slots = {
    root: ["root", orientation, alternativeLabel && "alternativeLabel"]
  };
  return composeClasses(slots, getStepperUtilityClass, classes);
};
const StepperRoot = styled("div", {
  name: "MuiStepper",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.orientation], ownerState.alternativeLabel && styles2.alternativeLabel];
  }
})(({
  ownerState
}) => _extends({
  display: "flex"
}, ownerState.orientation === "horizontal" && {
  flexDirection: "row",
  alignItems: "center"
}, ownerState.orientation === "vertical" && {
  flexDirection: "column"
}, ownerState.alternativeLabel && {
  alignItems: "flex-start"
}));
const defaultConnector = /* @__PURE__ */ jsxRuntimeExports.jsx(StepConnector, {});
const Stepper = /* @__PURE__ */ reactExports.forwardRef(function Stepper2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiStepper"
  });
  const {
    activeStep = 0,
    alternativeLabel = false,
    children,
    className,
    component = "div",
    connector = defaultConnector,
    nonLinear = false,
    orientation = "horizontal"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$m);
  const ownerState = _extends({}, props, {
    alternativeLabel,
    orientation,
    component
  });
  const classes = useUtilityClasses$l(ownerState);
  const childrenArray = reactExports.Children.toArray(children).filter(Boolean);
  const steps = childrenArray.map((step, index) => {
    return /* @__PURE__ */ reactExports.cloneElement(step, _extends({
      index,
      last: index + 1 === childrenArray.length
    }, step.props));
  });
  const contextValue = reactExports.useMemo(() => ({
    activeStep,
    alternativeLabel,
    connector,
    nonLinear,
    orientation
  }), [activeStep, alternativeLabel, connector, nonLinear, orientation]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StepperContext.Provider, {
    value: contextValue,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepperRoot, _extends({
      as: component,
      ownerState,
      className: clsx(classes.root, className),
      ref
    }, other, {
      children: steps
    }))
  });
});
function getSwitchUtilityClass(slot) {
  return generateUtilityClass$2("MuiSwitch", slot);
}
const switchClasses = generateUtilityClasses("MuiSwitch", ["root", "edgeStart", "edgeEnd", "switchBase", "colorPrimary", "colorSecondary", "sizeSmall", "sizeMedium", "checked", "disabled", "input", "thumb", "track"]);
const _excluded$l = ["className", "color", "edge", "size", "sx"];
const useThemeProps = createUseThemeProps();
const useUtilityClasses$k = (ownerState) => {
  const {
    classes,
    edge,
    size,
    color: color2,
    checked,
    disabled
  } = ownerState;
  const slots = {
    root: ["root", edge && `edge${capitalize$1(edge)}`, `size${capitalize$1(size)}`],
    switchBase: ["switchBase", `color${capitalize$1(color2)}`, checked && "checked", disabled && "disabled"],
    thumb: ["thumb"],
    track: ["track"],
    input: ["input"]
  };
  const composedClasses = composeClasses(slots, getSwitchUtilityClass, classes);
  return _extends({}, classes, composedClasses);
};
const SwitchRoot = styled("span", {
  name: "MuiSwitch",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.edge && styles2[`edge${capitalize$1(ownerState.edge)}`], styles2[`size${capitalize$1(ownerState.size)}`]];
  }
})({
  display: "inline-flex",
  width: 34 + 12 * 2,
  height: 14 + 12 * 2,
  overflow: "hidden",
  padding: 12,
  boxSizing: "border-box",
  position: "relative",
  flexShrink: 0,
  zIndex: 0,
  // Reset the stacking context.
  verticalAlign: "middle",
  // For correct alignment with the text.
  "@media print": {
    colorAdjust: "exact"
  },
  variants: [{
    props: {
      edge: "start"
    },
    style: {
      marginLeft: -8
    }
  }, {
    props: {
      edge: "end"
    },
    style: {
      marginRight: -8
    }
  }, {
    props: {
      size: "small"
    },
    style: {
      width: 40,
      height: 24,
      padding: 7,
      [`& .${switchClasses.thumb}`]: {
        width: 16,
        height: 16
      },
      [`& .${switchClasses.switchBase}`]: {
        padding: 4,
        [`&.${switchClasses.checked}`]: {
          transform: "translateX(16px)"
        }
      }
    }
  }]
});
const SwitchSwitchBase = styled(SwitchBase, {
  name: "MuiSwitch",
  slot: "SwitchBase",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.switchBase, {
      [`& .${switchClasses.input}`]: styles2.input
    }, ownerState.color !== "default" && styles2[`color${capitalize$1(ownerState.color)}`]];
  }
})(({
  theme
}) => ({
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1,
  // Render above the focus ripple.
  color: theme.vars ? theme.vars.palette.Switch.defaultColor : `${theme.palette.mode === "light" ? theme.palette.common.white : theme.palette.grey[300]}`,
  transition: theme.transitions.create(["left", "transform"], {
    duration: theme.transitions.duration.shortest
  }),
  [`&.${switchClasses.checked}`]: {
    transform: "translateX(20px)"
  },
  [`&.${switchClasses.disabled}`]: {
    color: theme.vars ? theme.vars.palette.Switch.defaultDisabledColor : `${theme.palette.mode === "light" ? theme.palette.grey[100] : theme.palette.grey[600]}`
  },
  [`&.${switchClasses.checked} + .${switchClasses.track}`]: {
    opacity: 0.5
  },
  [`&.${switchClasses.disabled} + .${switchClasses.track}`]: {
    opacity: theme.vars ? theme.vars.opacity.switchTrackDisabled : `${theme.palette.mode === "light" ? 0.12 : 0.2}`
  },
  [`& .${switchClasses.input}`]: {
    left: "-100%",
    width: "300%"
  }
}), ({
  theme
}) => ({
  "&:hover": {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.action.activeChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette.action.active, theme.palette.action.hoverOpacity),
    // Reset on touch devices, it doesn't add specificity
    "@media (hover: none)": {
      backgroundColor: "transparent"
    }
  },
  variants: [...Object.entries(theme.palette).filter(([, value]) => value.main && value.light).map(([color2]) => ({
    props: {
      color: color2
    },
    style: {
      [`&.${switchClasses.checked}`]: {
        color: (theme.vars || theme).palette[color2].main,
        "&:hover": {
          backgroundColor: theme.vars ? `rgba(${theme.vars.palette[color2].mainChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha_1(theme.palette[color2].main, theme.palette.action.hoverOpacity),
          "@media (hover: none)": {
            backgroundColor: "transparent"
          }
        },
        [`&.${switchClasses.disabled}`]: {
          color: theme.vars ? theme.vars.palette.Switch[`${color2}DisabledColor`] : `${theme.palette.mode === "light" ? lighten_1(theme.palette[color2].main, 0.62) : darken_1(theme.palette[color2].main, 0.55)}`
        }
      },
      [`&.${switchClasses.checked} + .${switchClasses.track}`]: {
        backgroundColor: (theme.vars || theme).palette[color2].main
      }
    }
  }))]
}));
const SwitchTrack = styled("span", {
  name: "MuiSwitch",
  slot: "Track",
  overridesResolver: (props, styles2) => styles2.track
})(({
  theme
}) => ({
  height: "100%",
  width: "100%",
  borderRadius: 14 / 2,
  zIndex: -1,
  transition: theme.transitions.create(["opacity", "background-color"], {
    duration: theme.transitions.duration.shortest
  }),
  backgroundColor: theme.vars ? theme.vars.palette.common.onBackground : `${theme.palette.mode === "light" ? theme.palette.common.black : theme.palette.common.white}`,
  opacity: theme.vars ? theme.vars.opacity.switchTrack : `${theme.palette.mode === "light" ? 0.38 : 0.3}`
}));
const SwitchThumb = styled("span", {
  name: "MuiSwitch",
  slot: "Thumb",
  overridesResolver: (props, styles2) => styles2.thumb
})(({
  theme
}) => ({
  boxShadow: (theme.vars || theme).shadows[1],
  backgroundColor: "currentColor",
  width: 20,
  height: 20,
  borderRadius: "50%"
}));
const Switch = /* @__PURE__ */ reactExports.forwardRef(function Switch2(inProps, ref) {
  const props = useThemeProps({
    props: inProps,
    name: "MuiSwitch"
  });
  const {
    className,
    color: color2 = "primary",
    edge = false,
    size = "medium",
    sx
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$l);
  const ownerState = _extends({}, props, {
    color: color2,
    edge,
    size
  });
  const classes = useUtilityClasses$k(ownerState);
  const icon = /* @__PURE__ */ jsxRuntimeExports.jsx(SwitchThumb, {
    className: classes.thumb,
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SwitchRoot, {
    className: clsx(classes.root, className),
    sx,
    ownerState,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SwitchSwitchBase, _extends({
      type: "checkbox",
      icon,
      checkedIcon: icon,
      ref,
      ownerState
    }, other, {
      classes: _extends({}, classes, {
        root: classes.switchBase
      })
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(SwitchTrack, {
      className: classes.track,
      ownerState
    })]
  });
});
const TableContext = /* @__PURE__ */ reactExports.createContext();
function getTableUtilityClass(slot) {
  return generateUtilityClass$2("MuiTable", slot);
}
generateUtilityClasses("MuiTable", ["root", "stickyHeader"]);
const _excluded$k = ["className", "component", "padding", "size", "stickyHeader"];
const useUtilityClasses$j = (ownerState) => {
  const {
    classes,
    stickyHeader
  } = ownerState;
  const slots = {
    root: ["root", stickyHeader && "stickyHeader"]
  };
  return composeClasses(slots, getTableUtilityClass, classes);
};
const TableRoot = styled("table", {
  name: "MuiTable",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.stickyHeader && styles2.stickyHeader];
  }
})(({
  theme,
  ownerState
}) => _extends({
  display: "table",
  width: "100%",
  borderCollapse: "collapse",
  borderSpacing: 0,
  "& caption": _extends({}, theme.typography.body2, {
    padding: theme.spacing(2),
    color: (theme.vars || theme).palette.text.secondary,
    textAlign: "left",
    captionSide: "bottom"
  })
}, ownerState.stickyHeader && {
  borderCollapse: "separate"
}));
const defaultComponent$4 = "table";
const Table = /* @__PURE__ */ reactExports.forwardRef(function Table2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTable"
  });
  const {
    className,
    component = defaultComponent$4,
    padding: padding2 = "normal",
    size = "medium",
    stickyHeader = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$k);
  const ownerState = _extends({}, props, {
    component,
    padding: padding2,
    size,
    stickyHeader
  });
  const classes = useUtilityClasses$j(ownerState);
  const table = reactExports.useMemo(() => ({
    padding: padding2,
    size,
    stickyHeader
  }), [padding2, size, stickyHeader]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableContext.Provider, {
    value: table,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableRoot, _extends({
      as: component,
      role: component === defaultComponent$4 ? null : "table",
      ref,
      className: clsx(classes.root, className),
      ownerState
    }, other))
  });
});
const Tablelvl2Context = /* @__PURE__ */ reactExports.createContext();
function getTableBodyUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableBody", slot);
}
generateUtilityClasses("MuiTableBody", ["root"]);
const _excluded$j = ["className", "component"];
const useUtilityClasses$i = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTableBodyUtilityClass, classes);
};
const TableBodyRoot = styled("tbody", {
  name: "MuiTableBody",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  display: "table-row-group"
});
const tablelvl2$2 = {
  variant: "body"
};
const defaultComponent$3 = "tbody";
const TableBody = /* @__PURE__ */ reactExports.forwardRef(function TableBody2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableBody"
  });
  const {
    className,
    component = defaultComponent$3
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$j);
  const ownerState = _extends({}, props, {
    component
  });
  const classes = useUtilityClasses$i(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Tablelvl2Context.Provider, {
    value: tablelvl2$2,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableBodyRoot, _extends({
      className: clsx(classes.root, className),
      as: component,
      ref,
      role: component === defaultComponent$3 ? null : "rowgroup",
      ownerState
    }, other))
  });
});
function getTableCellUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableCell", slot);
}
const tableCellClasses = generateUtilityClasses("MuiTableCell", ["root", "head", "body", "footer", "sizeSmall", "sizeMedium", "paddingCheckbox", "paddingNone", "alignLeft", "alignCenter", "alignRight", "alignJustify", "stickyHeader"]);
const _excluded$i = ["align", "className", "component", "padding", "scope", "size", "sortDirection", "variant"];
const useUtilityClasses$h = (ownerState) => {
  const {
    classes,
    variant,
    align,
    padding: padding2,
    size,
    stickyHeader
  } = ownerState;
  const slots = {
    root: ["root", variant, stickyHeader && "stickyHeader", align !== "inherit" && `align${capitalize$1(align)}`, padding2 !== "normal" && `padding${capitalize$1(padding2)}`, `size${capitalize$1(size)}`]
  };
  return composeClasses(slots, getTableCellUtilityClass, classes);
};
const TableCellRoot = styled("td", {
  name: "MuiTableCell",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.variant], styles2[`size${capitalize$1(ownerState.size)}`], ownerState.padding !== "normal" && styles2[`padding${capitalize$1(ownerState.padding)}`], ownerState.align !== "inherit" && styles2[`align${capitalize$1(ownerState.align)}`], ownerState.stickyHeader && styles2.stickyHeader];
  }
})(({
  theme,
  ownerState
}) => _extends({}, theme.typography.body2, {
  display: "table-cell",
  verticalAlign: "inherit",
  // Workaround for a rendering bug with spanned columns in Chrome 62.0.
  // Removes the alpha (sets it to 1), and lightens or darkens the theme color.
  borderBottom: theme.vars ? `1px solid ${theme.vars.palette.TableCell.border}` : `1px solid
    ${theme.palette.mode === "light" ? lighten_1(alpha_1(theme.palette.divider, 1), 0.88) : darken_1(alpha_1(theme.palette.divider, 1), 0.68)}`,
  textAlign: "left",
  padding: 16
}, ownerState.variant === "head" && {
  color: (theme.vars || theme).palette.text.primary,
  lineHeight: theme.typography.pxToRem(24),
  fontWeight: theme.typography.fontWeightMedium
}, ownerState.variant === "body" && {
  color: (theme.vars || theme).palette.text.primary
}, ownerState.variant === "footer" && {
  color: (theme.vars || theme).palette.text.secondary,
  lineHeight: theme.typography.pxToRem(21),
  fontSize: theme.typography.pxToRem(12)
}, ownerState.size === "small" && {
  padding: "6px 16px",
  [`&.${tableCellClasses.paddingCheckbox}`]: {
    width: 24,
    // prevent the checkbox column from growing
    padding: "0 12px 0 16px",
    "& > *": {
      padding: 0
    }
  }
}, ownerState.padding === "checkbox" && {
  width: 48,
  // prevent the checkbox column from growing
  padding: "0 0 0 4px"
}, ownerState.padding === "none" && {
  padding: 0
}, ownerState.align === "left" && {
  textAlign: "left"
}, ownerState.align === "center" && {
  textAlign: "center"
}, ownerState.align === "right" && {
  textAlign: "right",
  flexDirection: "row-reverse"
}, ownerState.align === "justify" && {
  textAlign: "justify"
}, ownerState.stickyHeader && {
  position: "sticky",
  top: 0,
  zIndex: 2,
  backgroundColor: (theme.vars || theme).palette.background.default
}));
const TableCell = /* @__PURE__ */ reactExports.forwardRef(function TableCell2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableCell"
  });
  const {
    align = "inherit",
    className,
    component: componentProp,
    padding: paddingProp,
    scope: scopeProp,
    size: sizeProp,
    sortDirection,
    variant: variantProp
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$i);
  const table = reactExports.useContext(TableContext);
  const tablelvl22 = reactExports.useContext(Tablelvl2Context);
  const isHeadCell = tablelvl22 && tablelvl22.variant === "head";
  let component;
  if (componentProp) {
    component = componentProp;
  } else {
    component = isHeadCell ? "th" : "td";
  }
  let scope = scopeProp;
  if (component === "td") {
    scope = void 0;
  } else if (!scope && isHeadCell) {
    scope = "col";
  }
  const variant = variantProp || tablelvl22 && tablelvl22.variant;
  const ownerState = _extends({}, props, {
    align,
    component,
    padding: paddingProp || (table && table.padding ? table.padding : "normal"),
    size: sizeProp || (table && table.size ? table.size : "medium"),
    sortDirection,
    stickyHeader: variant === "head" && table && table.stickyHeader,
    variant
  });
  const classes = useUtilityClasses$h(ownerState);
  let ariaSort = null;
  if (sortDirection) {
    ariaSort = sortDirection === "asc" ? "ascending" : "descending";
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCellRoot, _extends({
    as: component,
    ref,
    className: clsx(classes.root, className),
    "aria-sort": ariaSort,
    scope,
    ownerState
  }, other));
});
function getTableContainerUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableContainer", slot);
}
generateUtilityClasses("MuiTableContainer", ["root"]);
const _excluded$h = ["className", "component"];
const useUtilityClasses$g = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTableContainerUtilityClass, classes);
};
const TableContainerRoot = styled("div", {
  name: "MuiTableContainer",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  width: "100%",
  overflowX: "auto"
});
const TableContainer = /* @__PURE__ */ reactExports.forwardRef(function TableContainer2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableContainer"
  });
  const {
    className,
    component = "div"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$h);
  const ownerState = _extends({}, props, {
    component
  });
  const classes = useUtilityClasses$g(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainerRoot, _extends({
    ref,
    as: component,
    className: clsx(classes.root, className),
    ownerState
  }, other));
});
function getTableFooterUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableFooter", slot);
}
generateUtilityClasses("MuiTableFooter", ["root"]);
const _excluded$g = ["className", "component"];
const useUtilityClasses$f = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTableFooterUtilityClass, classes);
};
const TableFooterRoot = styled("tfoot", {
  name: "MuiTableFooter",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  display: "table-footer-group"
});
const tablelvl2$1 = {
  variant: "footer"
};
const defaultComponent$2 = "tfoot";
const TableFooter = /* @__PURE__ */ reactExports.forwardRef(function TableFooter2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableFooter"
  });
  const {
    className,
    component = defaultComponent$2
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$g);
  const ownerState = _extends({}, props, {
    component
  });
  const classes = useUtilityClasses$f(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Tablelvl2Context.Provider, {
    value: tablelvl2$1,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableFooterRoot, _extends({
      as: component,
      className: clsx(classes.root, className),
      ref,
      role: component === defaultComponent$2 ? null : "rowgroup",
      ownerState
    }, other))
  });
});
function getTableHeadUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableHead", slot);
}
generateUtilityClasses("MuiTableHead", ["root"]);
const _excluded$f = ["className", "component"];
const useUtilityClasses$e = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTableHeadUtilityClass, classes);
};
const TableHeadRoot = styled("thead", {
  name: "MuiTableHead",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  display: "table-header-group"
});
const tablelvl2 = {
  variant: "head"
};
const defaultComponent$1 = "thead";
const TableHead = /* @__PURE__ */ reactExports.forwardRef(function TableHead2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableHead"
  });
  const {
    className,
    component = defaultComponent$1
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$f);
  const ownerState = _extends({}, props, {
    component
  });
  const classes = useUtilityClasses$e(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Tablelvl2Context.Provider, {
    value: tablelvl2,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeadRoot, _extends({
      as: component,
      className: clsx(classes.root, className),
      ref,
      role: component === defaultComponent$1 ? null : "rowgroup",
      ownerState
    }, other))
  });
});
function getToolbarUtilityClass(slot) {
  return generateUtilityClass$2("MuiToolbar", slot);
}
generateUtilityClasses("MuiToolbar", ["root", "gutters", "regular", "dense"]);
const _excluded$e = ["className", "component", "disableGutters", "variant"];
const useUtilityClasses$d = (ownerState) => {
  const {
    classes,
    disableGutters,
    variant
  } = ownerState;
  const slots = {
    root: ["root", !disableGutters && "gutters", variant]
  };
  return composeClasses(slots, getToolbarUtilityClass, classes);
};
const ToolbarRoot = styled("div", {
  name: "MuiToolbar",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, !ownerState.disableGutters && styles2.gutters, styles2[ownerState.variant]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  position: "relative",
  display: "flex",
  alignItems: "center"
}, !ownerState.disableGutters && {
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3)
  }
}, ownerState.variant === "dense" && {
  minHeight: 48
}), ({
  theme,
  ownerState
}) => ownerState.variant === "regular" && theme.mixins.toolbar);
const Toolbar = /* @__PURE__ */ reactExports.forwardRef(function Toolbar2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiToolbar"
  });
  const {
    className,
    component = "div",
    disableGutters = false,
    variant = "regular"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$e);
  const ownerState = _extends({}, props, {
    component,
    disableGutters,
    variant
  });
  const classes = useUtilityClasses$d(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ToolbarRoot, _extends({
    as: component,
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other));
});
const _excluded$d = ["backIconButtonProps", "count", "disabled", "getItemAriaLabel", "nextIconButtonProps", "onPageChange", "page", "rowsPerPage", "showFirstButton", "showLastButton", "slots", "slotProps"];
const TablePaginationActions = /* @__PURE__ */ reactExports.forwardRef(function TablePaginationActions2(props, ref) {
  var _slots$firstButton, _slots$lastButton, _slots$nextButton, _slots$previousButton, _slots$firstButtonIco, _slots$lastButtonIcon, _slots$nextButtonIcon, _slots$previousButton2;
  const {
    backIconButtonProps,
    count,
    disabled = false,
    getItemAriaLabel,
    nextIconButtonProps,
    onPageChange,
    page,
    rowsPerPage,
    showFirstButton,
    showLastButton,
    slots = {},
    slotProps = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$d);
  const isRtl = useRtl();
  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };
  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };
  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };
  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };
  const FirstButton = (_slots$firstButton = slots.firstButton) != null ? _slots$firstButton : IconButton;
  const LastButton = (_slots$lastButton = slots.lastButton) != null ? _slots$lastButton : IconButton;
  const NextButton = (_slots$nextButton = slots.nextButton) != null ? _slots$nextButton : IconButton;
  const PreviousButton = (_slots$previousButton = slots.previousButton) != null ? _slots$previousButton : IconButton;
  const FirstButtonIcon = (_slots$firstButtonIco = slots.firstButtonIcon) != null ? _slots$firstButtonIco : FirstPageIconDefault;
  const LastButtonIcon = (_slots$lastButtonIcon = slots.lastButtonIcon) != null ? _slots$lastButtonIcon : LastPageIconDefault;
  const NextButtonIcon = (_slots$nextButtonIcon = slots.nextButtonIcon) != null ? _slots$nextButtonIcon : KeyboardArrowRight$1;
  const PreviousButtonIcon = (_slots$previousButton2 = slots.previousButtonIcon) != null ? _slots$previousButton2 : KeyboardArrowLeft$1;
  const FirstButtonSlot = isRtl ? LastButton : FirstButton;
  const PreviousButtonSlot = isRtl ? NextButton : PreviousButton;
  const NextButtonSlot = isRtl ? PreviousButton : NextButton;
  const LastButtonSlot = isRtl ? FirstButton : LastButton;
  const firstButtonSlotProps = isRtl ? slotProps.lastButton : slotProps.firstButton;
  const previousButtonSlotProps = isRtl ? slotProps.nextButton : slotProps.previousButton;
  const nextButtonSlotProps = isRtl ? slotProps.previousButton : slotProps.nextButton;
  const lastButtonSlotProps = isRtl ? slotProps.firstButton : slotProps.lastButton;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", _extends({
    ref
  }, other, {
    children: [showFirstButton && /* @__PURE__ */ jsxRuntimeExports.jsx(FirstButtonSlot, _extends({
      onClick: handleFirstPageButtonClick,
      disabled: disabled || page === 0,
      "aria-label": getItemAriaLabel("first", page),
      title: getItemAriaLabel("first", page)
    }, firstButtonSlotProps, {
      children: isRtl ? /* @__PURE__ */ jsxRuntimeExports.jsx(LastButtonIcon, _extends({}, slotProps.lastButtonIcon)) : /* @__PURE__ */ jsxRuntimeExports.jsx(FirstButtonIcon, _extends({}, slotProps.firstButtonIcon))
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(PreviousButtonSlot, _extends({
      onClick: handleBackButtonClick,
      disabled: disabled || page === 0,
      color: "inherit",
      "aria-label": getItemAriaLabel("previous", page),
      title: getItemAriaLabel("previous", page)
    }, previousButtonSlotProps != null ? previousButtonSlotProps : backIconButtonProps, {
      children: isRtl ? /* @__PURE__ */ jsxRuntimeExports.jsx(NextButtonIcon, _extends({}, slotProps.nextButtonIcon)) : /* @__PURE__ */ jsxRuntimeExports.jsx(PreviousButtonIcon, _extends({}, slotProps.previousButtonIcon))
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(NextButtonSlot, _extends({
      onClick: handleNextButtonClick,
      disabled: disabled || (count !== -1 ? page >= Math.ceil(count / rowsPerPage) - 1 : false),
      color: "inherit",
      "aria-label": getItemAriaLabel("next", page),
      title: getItemAriaLabel("next", page)
    }, nextButtonSlotProps != null ? nextButtonSlotProps : nextIconButtonProps, {
      children: isRtl ? /* @__PURE__ */ jsxRuntimeExports.jsx(PreviousButtonIcon, _extends({}, slotProps.previousButtonIcon)) : /* @__PURE__ */ jsxRuntimeExports.jsx(NextButtonIcon, _extends({}, slotProps.nextButtonIcon))
    })), showLastButton && /* @__PURE__ */ jsxRuntimeExports.jsx(LastButtonSlot, _extends({
      onClick: handleLastPageButtonClick,
      disabled: disabled || page >= Math.ceil(count / rowsPerPage) - 1,
      "aria-label": getItemAriaLabel("last", page),
      title: getItemAriaLabel("last", page)
    }, lastButtonSlotProps, {
      children: isRtl ? /* @__PURE__ */ jsxRuntimeExports.jsx(FirstButtonIcon, _extends({}, slotProps.firstButtonIcon)) : /* @__PURE__ */ jsxRuntimeExports.jsx(LastButtonIcon, _extends({}, slotProps.lastButtonIcon))
    }))]
  }));
});
function getTablePaginationUtilityClass(slot) {
  return generateUtilityClass$2("MuiTablePagination", slot);
}
const tablePaginationClasses = generateUtilityClasses("MuiTablePagination", ["root", "toolbar", "spacer", "selectLabel", "selectRoot", "select", "selectIcon", "input", "menuItem", "displayedRows", "actions"]);
var _InputBase;
const _excluded$c = ["ActionsComponent", "backIconButtonProps", "className", "colSpan", "component", "count", "disabled", "getItemAriaLabel", "labelDisplayedRows", "labelRowsPerPage", "nextIconButtonProps", "onPageChange", "onRowsPerPageChange", "page", "rowsPerPage", "rowsPerPageOptions", "SelectProps", "showFirstButton", "showLastButton", "slotProps", "slots"];
const TablePaginationRoot = styled(TableCell, {
  name: "MuiTablePagination",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => ({
  overflow: "auto",
  color: (theme.vars || theme).palette.text.primary,
  fontSize: theme.typography.pxToRem(14),
  // Increase the specificity to override TableCell.
  "&:last-child": {
    padding: 0
  }
}));
const TablePaginationToolbar = styled(Toolbar, {
  name: "MuiTablePagination",
  slot: "Toolbar",
  overridesResolver: (props, styles2) => _extends({
    [`& .${tablePaginationClasses.actions}`]: styles2.actions
  }, styles2.toolbar)
})(({
  theme
}) => ({
  minHeight: 52,
  paddingRight: 2,
  [`${theme.breakpoints.up("xs")} and (orientation: landscape)`]: {
    minHeight: 52
  },
  [theme.breakpoints.up("sm")]: {
    minHeight: 52,
    paddingRight: 2
  },
  [`& .${tablePaginationClasses.actions}`]: {
    flexShrink: 0,
    marginLeft: 20
  }
}));
const TablePaginationSpacer = styled("div", {
  name: "MuiTablePagination",
  slot: "Spacer",
  overridesResolver: (props, styles2) => styles2.spacer
})({
  flex: "1 1 100%"
});
const TablePaginationSelectLabel = styled("p", {
  name: "MuiTablePagination",
  slot: "SelectLabel",
  overridesResolver: (props, styles2) => styles2.selectLabel
})(({
  theme
}) => _extends({}, theme.typography.body2, {
  flexShrink: 0
}));
const TablePaginationSelect = styled(Select, {
  name: "MuiTablePagination",
  slot: "Select",
  overridesResolver: (props, styles2) => _extends({
    [`& .${tablePaginationClasses.selectIcon}`]: styles2.selectIcon,
    [`& .${tablePaginationClasses.select}`]: styles2.select
  }, styles2.input, styles2.selectRoot)
})({
  color: "inherit",
  fontSize: "inherit",
  flexShrink: 0,
  marginRight: 32,
  marginLeft: 8,
  [`& .${tablePaginationClasses.select}`]: {
    paddingLeft: 8,
    paddingRight: 24,
    textAlign: "right",
    textAlignLast: "right"
    // Align <select> on Chrome.
  }
});
const TablePaginationMenuItem = styled(MenuItem, {
  name: "MuiTablePagination",
  slot: "MenuItem",
  overridesResolver: (props, styles2) => styles2.menuItem
})({});
const TablePaginationDisplayedRows = styled("p", {
  name: "MuiTablePagination",
  slot: "DisplayedRows",
  overridesResolver: (props, styles2) => styles2.displayedRows
})(({
  theme
}) => _extends({}, theme.typography.body2, {
  flexShrink: 0
}));
function defaultLabelDisplayedRows({
  from: from2,
  to,
  count
}) {
  return `${from2}–${to} of ${count !== -1 ? count : `more than ${to}`}`;
}
function defaultGetAriaLabel(type) {
  return `Go to ${type} page`;
}
const useUtilityClasses$c = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    toolbar: ["toolbar"],
    spacer: ["spacer"],
    selectLabel: ["selectLabel"],
    select: ["select"],
    input: ["input"],
    selectIcon: ["selectIcon"],
    menuItem: ["menuItem"],
    displayedRows: ["displayedRows"],
    actions: ["actions"]
  };
  return composeClasses(slots, getTablePaginationUtilityClass, classes);
};
const TablePagination = /* @__PURE__ */ reactExports.forwardRef(function TablePagination2(inProps, ref) {
  var _slotProps$select;
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTablePagination"
  });
  const {
    ActionsComponent = TablePaginationActions,
    backIconButtonProps,
    className,
    colSpan: colSpanProp,
    component = TableCell,
    count,
    disabled = false,
    getItemAriaLabel = defaultGetAriaLabel,
    labelDisplayedRows = defaultLabelDisplayedRows,
    labelRowsPerPage = "Rows per page:",
    nextIconButtonProps,
    onPageChange,
    onRowsPerPageChange,
    page,
    rowsPerPage,
    rowsPerPageOptions = [10, 25, 50, 100],
    SelectProps = {},
    showFirstButton = false,
    showLastButton = false,
    slotProps = {},
    slots = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$c);
  const ownerState = props;
  const classes = useUtilityClasses$c(ownerState);
  const selectProps = (_slotProps$select = slotProps == null ? void 0 : slotProps.select) != null ? _slotProps$select : SelectProps;
  const MenuItemComponent = selectProps.native ? "option" : TablePaginationMenuItem;
  let colSpan;
  if (component === TableCell || component === "td") {
    colSpan = colSpanProp || 1e3;
  }
  const selectId = useId(selectProps.id);
  const labelId = useId(selectProps.labelId);
  const getLabelDisplayedRowsTo = () => {
    if (count === -1) {
      return (page + 1) * rowsPerPage;
    }
    return rowsPerPage === -1 ? count : Math.min(count, (page + 1) * rowsPerPage);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TablePaginationRoot, _extends({
    colSpan,
    ref,
    as: component,
    ownerState,
    className: clsx(classes.root, className)
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TablePaginationToolbar, {
      className: classes.toolbar,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TablePaginationSpacer, {
        className: classes.spacer
      }), rowsPerPageOptions.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(TablePaginationSelectLabel, {
        className: classes.selectLabel,
        id: labelId,
        children: labelRowsPerPage
      }), rowsPerPageOptions.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(TablePaginationSelect, _extends({
        variant: "standard"
      }, !selectProps.variant && {
        input: _InputBase || (_InputBase = /* @__PURE__ */ jsxRuntimeExports.jsx(InputBase, {}))
      }, {
        value: rowsPerPage,
        onChange: onRowsPerPageChange,
        id: selectId,
        labelId
      }, selectProps, {
        classes: _extends({}, selectProps.classes, {
          // TODO v5 remove `classes.input`
          root: clsx(classes.input, classes.selectRoot, (selectProps.classes || {}).root),
          select: clsx(classes.select, (selectProps.classes || {}).select),
          // TODO v5 remove `selectIcon`
          icon: clsx(classes.selectIcon, (selectProps.classes || {}).icon)
        }),
        disabled,
        children: rowsPerPageOptions.map((rowsPerPageOption) => /* @__PURE__ */ reactExports.createElement(MenuItemComponent, _extends({}, !isHostComponent(MenuItemComponent) && {
          ownerState
        }, {
          className: classes.menuItem,
          key: rowsPerPageOption.label ? rowsPerPageOption.label : rowsPerPageOption,
          value: rowsPerPageOption.value ? rowsPerPageOption.value : rowsPerPageOption
        }), rowsPerPageOption.label ? rowsPerPageOption.label : rowsPerPageOption))
      })), /* @__PURE__ */ jsxRuntimeExports.jsx(TablePaginationDisplayedRows, {
        className: classes.displayedRows,
        children: labelDisplayedRows({
          from: count === 0 ? 0 : page * rowsPerPage + 1,
          to: getLabelDisplayedRowsTo(),
          count: count === -1 ? -1 : count,
          page
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ActionsComponent, {
        className: classes.actions,
        backIconButtonProps,
        count,
        nextIconButtonProps,
        onPageChange,
        page,
        rowsPerPage,
        showFirstButton,
        showLastButton,
        slotProps: slotProps.actions,
        slots: slots.actions,
        getItemAriaLabel,
        disabled
      })]
    })
  }));
});
function getTableRowUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableRow", slot);
}
const tableRowClasses = generateUtilityClasses("MuiTableRow", ["root", "selected", "hover", "head", "footer"]);
const _excluded$b = ["className", "component", "hover", "selected"];
const useUtilityClasses$b = (ownerState) => {
  const {
    classes,
    selected,
    hover,
    head,
    footer
  } = ownerState;
  const slots = {
    root: ["root", selected && "selected", hover && "hover", head && "head", footer && "footer"]
  };
  return composeClasses(slots, getTableRowUtilityClass, classes);
};
const TableRowRoot = styled("tr", {
  name: "MuiTableRow",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.head && styles2.head, ownerState.footer && styles2.footer];
  }
})(({
  theme
}) => ({
  color: "inherit",
  display: "table-row",
  verticalAlign: "middle",
  // We disable the focus ring for mouse, touch and keyboard users.
  outline: 0,
  [`&.${tableRowClasses.hover}:hover`]: {
    backgroundColor: (theme.vars || theme).palette.action.hover
  },
  [`&.${tableRowClasses.selected}`]: {
    backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    "&:hover": {
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha_1(theme.palette.primary.main, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity)
    }
  }
}));
const defaultComponent = "tr";
const TableRow = /* @__PURE__ */ reactExports.forwardRef(function TableRow2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableRow"
  });
  const {
    className,
    component = defaultComponent,
    hover = false,
    selected = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$b);
  const tablelvl22 = reactExports.useContext(Tablelvl2Context);
  const ownerState = _extends({}, props, {
    component,
    hover,
    selected,
    head: tablelvl22 && tablelvl22.variant === "head",
    footer: tablelvl22 && tablelvl22.variant === "footer"
  });
  const classes = useUtilityClasses$b(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableRowRoot, _extends({
    as: component,
    ref,
    className: clsx(classes.root, className),
    role: component === defaultComponent ? null : "row",
    ownerState
  }, other));
});
const ArrowDownwardIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"
}), "ArrowDownward");
function getTableSortLabelUtilityClass(slot) {
  return generateUtilityClass$2("MuiTableSortLabel", slot);
}
const tableSortLabelClasses = generateUtilityClasses("MuiTableSortLabel", ["root", "active", "icon", "iconDirectionDesc", "iconDirectionAsc"]);
const _excluded$a = ["active", "children", "className", "direction", "hideSortIcon", "IconComponent"];
const useUtilityClasses$a = (ownerState) => {
  const {
    classes,
    direction,
    active
  } = ownerState;
  const slots = {
    root: ["root", active && "active"],
    icon: ["icon", `iconDirection${capitalize$1(direction)}`]
  };
  return composeClasses(slots, getTableSortLabelUtilityClass, classes);
};
const TableSortLabelRoot = styled(ButtonBase, {
  name: "MuiTableSortLabel",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.active && styles2.active];
  }
})(({
  theme
}) => ({
  cursor: "pointer",
  display: "inline-flex",
  justifyContent: "flex-start",
  flexDirection: "inherit",
  alignItems: "center",
  "&:focus": {
    color: (theme.vars || theme).palette.text.secondary
  },
  "&:hover": {
    color: (theme.vars || theme).palette.text.secondary,
    [`& .${tableSortLabelClasses.icon}`]: {
      opacity: 0.5
    }
  },
  [`&.${tableSortLabelClasses.active}`]: {
    color: (theme.vars || theme).palette.text.primary,
    [`& .${tableSortLabelClasses.icon}`]: {
      opacity: 1,
      color: (theme.vars || theme).palette.text.secondary
    }
  }
}));
const TableSortLabelIcon = styled("span", {
  name: "MuiTableSortLabel",
  slot: "Icon",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.icon, styles2[`iconDirection${capitalize$1(ownerState.direction)}`]];
  }
})(({
  theme,
  ownerState
}) => _extends({
  fontSize: 18,
  marginRight: 4,
  marginLeft: 4,
  opacity: 0,
  transition: theme.transitions.create(["opacity", "transform"], {
    duration: theme.transitions.duration.shorter
  }),
  userSelect: "none"
}, ownerState.direction === "desc" && {
  transform: "rotate(0deg)"
}, ownerState.direction === "asc" && {
  transform: "rotate(180deg)"
}));
const TableSortLabel = /* @__PURE__ */ reactExports.forwardRef(function TableSortLabel2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTableSortLabel"
  });
  const {
    active = false,
    children,
    className,
    direction = "asc",
    hideSortIcon = false,
    IconComponent = ArrowDownwardIcon
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$a);
  const ownerState = _extends({}, props, {
    active,
    direction,
    hideSortIcon,
    IconComponent
  });
  const classes = useUtilityClasses$a(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableSortLabelRoot, _extends({
    className: clsx(classes.root, className),
    component: "span",
    disableRipple: true,
    ownerState,
    ref
  }, other, {
    children: [children, hideSortIcon && !active ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(TableSortLabelIcon, {
      as: IconComponent,
      className: clsx(classes.icon),
      ownerState
    })]
  }));
});
function getToggleButtonUtilityClass(slot) {
  return generateUtilityClass$2("MuiToggleButton", slot);
}
const toggleButtonClasses = generateUtilityClasses("MuiToggleButton", ["root", "disabled", "selected", "standard", "primary", "secondary", "sizeSmall", "sizeMedium", "sizeLarge", "fullWidth"]);
const ToggleButtonGroupContext = /* @__PURE__ */ reactExports.createContext({});
const ToggleButtonGroupButtonContext = /* @__PURE__ */ reactExports.createContext(void 0);
function isValueSelected(value, candidate) {
  if (candidate === void 0 || value === void 0) {
    return false;
  }
  if (Array.isArray(candidate)) {
    return candidate.indexOf(value) >= 0;
  }
  return value === candidate;
}
const _excluded$9 = ["value"], _excluded2$1 = ["children", "className", "color", "disabled", "disableFocusRipple", "fullWidth", "onChange", "onClick", "selected", "size", "value"];
const useUtilityClasses$9 = (ownerState) => {
  const {
    classes,
    fullWidth,
    selected,
    disabled,
    size,
    color: color2
  } = ownerState;
  const slots = {
    root: ["root", selected && "selected", disabled && "disabled", fullWidth && "fullWidth", `size${capitalize$1(size)}`, color2]
  };
  return composeClasses(slots, getToggleButtonUtilityClass, classes);
};
const ToggleButtonRoot = styled(ButtonBase, {
  name: "MuiToggleButton",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[`size${capitalize$1(ownerState.size)}`]];
  }
})(({
  theme,
  ownerState
}) => {
  let selectedColor = ownerState.color === "standard" ? theme.palette.text.primary : theme.palette[ownerState.color].main;
  let selectedColorChannel;
  if (theme.vars) {
    selectedColor = ownerState.color === "standard" ? theme.vars.palette.text.primary : theme.vars.palette[ownerState.color].main;
    selectedColorChannel = ownerState.color === "standard" ? theme.vars.palette.text.primaryChannel : theme.vars.palette[ownerState.color].mainChannel;
  }
  return _extends({}, theme.typography.button, {
    borderRadius: (theme.vars || theme).shape.borderRadius,
    padding: 11,
    border: `1px solid ${(theme.vars || theme).palette.divider}`,
    color: (theme.vars || theme).palette.action.active
  }, ownerState.fullWidth && {
    width: "100%"
  }, {
    [`&.${toggleButtonClasses.disabled}`]: {
      color: (theme.vars || theme).palette.action.disabled,
      border: `1px solid ${(theme.vars || theme).palette.action.disabledBackground}`
    },
    "&:hover": {
      textDecoration: "none",
      // Reset on mouse devices
      backgroundColor: theme.vars ? `rgba(${theme.vars.palette.text.primaryChannel} / ${theme.vars.palette.action.hoverOpacity})` : alpha$1(theme.palette.text.primary, theme.palette.action.hoverOpacity),
      "@media (hover: none)": {
        backgroundColor: "transparent"
      }
    },
    [`&.${toggleButtonClasses.selected}`]: {
      color: selectedColor,
      backgroundColor: theme.vars ? `rgba(${selectedColorChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha$1(selectedColor, theme.palette.action.selectedOpacity),
      "&:hover": {
        backgroundColor: theme.vars ? `rgba(${selectedColorChannel} / calc(${theme.vars.palette.action.selectedOpacity} + ${theme.vars.palette.action.hoverOpacity}))` : alpha$1(selectedColor, theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity),
        // Reset on touch devices, it doesn't add specificity
        "@media (hover: none)": {
          backgroundColor: theme.vars ? `rgba(${selectedColorChannel} / ${theme.vars.palette.action.selectedOpacity})` : alpha$1(selectedColor, theme.palette.action.selectedOpacity)
        }
      }
    }
  }, ownerState.size === "small" && {
    padding: 7,
    fontSize: theme.typography.pxToRem(13)
  }, ownerState.size === "large" && {
    padding: 15,
    fontSize: theme.typography.pxToRem(15)
  });
});
const ToggleButton = /* @__PURE__ */ reactExports.forwardRef(function ToggleButton2(inProps, ref) {
  const _React$useContext = reactExports.useContext(ToggleButtonGroupContext), {
    value: contextValue
  } = _React$useContext, contextProps = _objectWithoutPropertiesLoose(_React$useContext, _excluded$9);
  const toggleButtonGroupButtonContextPositionClassName = reactExports.useContext(ToggleButtonGroupButtonContext);
  const resolvedProps = resolveProps(_extends({}, contextProps, {
    selected: isValueSelected(inProps.value, contextValue)
  }), inProps);
  const props = useThemeProps$a({
    props: resolvedProps,
    name: "MuiToggleButton"
  });
  const {
    children,
    className,
    color: color2 = "standard",
    disabled = false,
    disableFocusRipple = false,
    fullWidth = false,
    onChange,
    onClick,
    selected,
    size = "medium",
    value
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded2$1);
  const ownerState = _extends({}, props, {
    color: color2,
    disabled,
    disableFocusRipple,
    fullWidth,
    size
  });
  const classes = useUtilityClasses$9(ownerState);
  const handleChange = (event) => {
    if (onClick) {
      onClick(event, value);
      if (event.defaultPrevented) {
        return;
      }
    }
    if (onChange) {
      onChange(event, value);
    }
  };
  const positionClassName = toggleButtonGroupButtonContextPositionClassName || "";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButtonRoot, _extends({
    className: clsx(contextProps.className, classes.root, className, positionClassName),
    disabled,
    focusRipple: !disableFocusRipple,
    ref,
    onClick: handleChange,
    onChange,
    value,
    ownerState,
    "aria-pressed": selected
  }, other, {
    children
  }));
});
function getToggleButtonGroupUtilityClass(slot) {
  return generateUtilityClass$2("MuiToggleButtonGroup", slot);
}
const toggleButtonGroupClasses = generateUtilityClasses("MuiToggleButtonGroup", ["root", "selected", "vertical", "disabled", "grouped", "groupedHorizontal", "groupedVertical", "fullWidth", "firstButton", "lastButton", "middleButton"]);
const _excluded$8 = ["children", "className", "color", "disabled", "exclusive", "fullWidth", "onChange", "orientation", "size", "value"];
const useUtilityClasses$8 = (ownerState) => {
  const {
    classes,
    orientation,
    fullWidth,
    disabled
  } = ownerState;
  const slots = {
    root: ["root", orientation === "vertical" && "vertical", fullWidth && "fullWidth"],
    grouped: ["grouped", `grouped${capitalize$1(orientation)}`, disabled && "disabled"],
    firstButton: ["firstButton"],
    lastButton: ["lastButton"],
    middleButton: ["middleButton"]
  };
  return composeClasses(slots, getToggleButtonGroupUtilityClass, classes);
};
const ToggleButtonGroupRoot = styled("div", {
  name: "MuiToggleButtonGroup",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [{
      [`& .${toggleButtonGroupClasses.grouped}`]: styles2.grouped
    }, {
      [`& .${toggleButtonGroupClasses.grouped}`]: styles2[`grouped${capitalize$1(ownerState.orientation)}`]
    }, {
      [`& .${toggleButtonGroupClasses.firstButton}`]: styles2.firstButton
    }, {
      [`& .${toggleButtonGroupClasses.lastButton}`]: styles2.lastButton
    }, {
      [`& .${toggleButtonGroupClasses.middleButton}`]: styles2.middleButton
    }, styles2.root, ownerState.orientation === "vertical" && styles2.vertical, ownerState.fullWidth && styles2.fullWidth];
  }
})(({
  ownerState,
  theme
}) => _extends({
  display: "inline-flex",
  borderRadius: (theme.vars || theme).shape.borderRadius
}, ownerState.orientation === "vertical" && {
  flexDirection: "column"
}, ownerState.fullWidth && {
  width: "100%"
}, {
  [`& .${toggleButtonGroupClasses.grouped}`]: _extends({}, ownerState.orientation === "horizontal" ? {
    [`&.${toggleButtonGroupClasses.selected} + .${toggleButtonGroupClasses.grouped}.${toggleButtonGroupClasses.selected}`]: {
      borderLeft: 0,
      marginLeft: 0
    }
  } : {
    [`&.${toggleButtonGroupClasses.selected} + .${toggleButtonGroupClasses.grouped}.${toggleButtonGroupClasses.selected}`]: {
      borderTop: 0,
      marginTop: 0
    }
  })
}, ownerState.orientation === "horizontal" ? {
  [`& .${toggleButtonGroupClasses.firstButton},& .${toggleButtonGroupClasses.middleButton}`]: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  [`& .${toggleButtonGroupClasses.lastButton},& .${toggleButtonGroupClasses.middleButton}`]: {
    marginLeft: -1,
    borderLeft: "1px solid transparent",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0
  }
} : {
  [`& .${toggleButtonGroupClasses.firstButton},& .${toggleButtonGroupClasses.middleButton}`]: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  [`& .${toggleButtonGroupClasses.lastButton},& .${toggleButtonGroupClasses.middleButton}`]: {
    marginTop: -1,
    borderTop: "1px solid transparent",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  }
}, ownerState.orientation === "horizontal" ? {
  [`& .${toggleButtonGroupClasses.lastButton}.${toggleButtonClasses.disabled},& .${toggleButtonGroupClasses.middleButton}.${toggleButtonClasses.disabled}`]: {
    borderLeft: "1px solid transparent"
  }
} : {
  [`& .${toggleButtonGroupClasses.lastButton}.${toggleButtonClasses.disabled},& .${toggleButtonGroupClasses.middleButton}.${toggleButtonClasses.disabled}`]: {
    borderTop: "1px solid transparent"
  }
}));
const ToggleButtonGroup = /* @__PURE__ */ reactExports.forwardRef(function ToggleButtonGroup2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiToggleButtonGroup"
  });
  const {
    children,
    className,
    color: color2 = "standard",
    disabled = false,
    exclusive = false,
    fullWidth = false,
    onChange,
    orientation = "horizontal",
    size = "medium",
    value
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$8);
  const ownerState = _extends({}, props, {
    disabled,
    fullWidth,
    orientation,
    size
  });
  const classes = useUtilityClasses$8(ownerState);
  const handleChange = reactExports.useCallback((event, buttonValue) => {
    if (!onChange) {
      return;
    }
    const index = value && value.indexOf(buttonValue);
    let newValue;
    if (value && index >= 0) {
      newValue = value.slice();
      newValue.splice(index, 1);
    } else {
      newValue = value ? value.concat(buttonValue) : [buttonValue];
    }
    onChange(event, newValue);
  }, [onChange, value]);
  const handleExclusiveChange = reactExports.useCallback((event, buttonValue) => {
    if (!onChange) {
      return;
    }
    onChange(event, value === buttonValue ? null : buttonValue);
  }, [onChange, value]);
  const context = reactExports.useMemo(() => ({
    className: classes.grouped,
    onChange: exclusive ? handleExclusiveChange : handleChange,
    value,
    size,
    fullWidth,
    color: color2,
    disabled
  }), [classes.grouped, exclusive, handleExclusiveChange, handleChange, value, size, fullWidth, color2, disabled]);
  const validChildren = getValidReactChildren(children);
  const childrenCount = validChildren.length;
  const getButtonPositionClassName = (index) => {
    const isFirstButton = index === 0;
    const isLastButton = index === childrenCount - 1;
    if (isFirstButton && isLastButton) {
      return "";
    }
    if (isFirstButton) {
      return classes.firstButton;
    }
    if (isLastButton) {
      return classes.lastButton;
    }
    return classes.middleButton;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButtonGroupRoot, _extends({
    role: "group",
    className: clsx(classes.root, className),
    ref,
    ownerState
  }, other, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButtonGroupContext.Provider, {
      value: context,
      children: validChildren.map((child, index) => {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleButtonGroupButtonContext.Provider, {
          value: getButtonPositionClassName(index),
          children: child
        }, index);
      })
    })
  }));
});
const AccessAlarm$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m22 5.72-4.6-3.86-1.29 1.53 4.6 3.86zM7.88 3.39 6.6 1.86 2 5.71l1.29 1.53zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9m0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7"
}), "AccessAlarm");
const AccessTime$1 = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
}, "1")], "AccessTime");
const AccountBalance$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z"
}), "AccountBalance");
const AccountBalanceWallet$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2zm-9-2h10V8H12zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5"
}), "AccountBalanceWallet");
const AccountCircle = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20"
}), "AccountCircle");
const AccountTree$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z"
}), "AccountTree");
const Add$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"
}), "Add");
const AdminPanelSettings = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55-.69-.98-1.1-2.17-1.1-3.45 0-3.31 2.69-6 6-6"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 1.38c.62 0 1.12.51 1.12 1.12s-.51 1.12-1.12 1.12-1.12-.51-1.12-1.12.5-1.12 1.12-1.12m0 5.37c-.93 0-1.74-.46-2.24-1.17.05-.72 1.51-1.08 2.24-1.08s2.19.36 2.24 1.08c-.5.71-1.31 1.17-2.24 1.17"
}, "1")], "AdminPanelSettings");
const Analytics = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M9 17H7v-5h2zm4 0h-2v-3h2zm0-5h-2v-2h2zm4 5h-2V7h2z"
}), "Analytics");
const Api = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m14 12-2 2-2-2 2-2zm-2-6 2.12 2.12 2.5-2.5L12 1 7.38 5.62l2.5 2.5zm-6 6 2.12-2.12-2.5-2.5L1 12l4.62 4.62 2.5-2.5zm12 0-2.12 2.12 2.5 2.5L23 12l-4.62-4.62-2.5 2.5zm-6 6-2.12-2.12-2.5 2.5L12 23l4.62-4.62-2.5-2.5z"
}), "Api");
const Approval = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4 16v6h16v-6c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2m14 2H6v-2h12zM12 2C9.24 2 7 4.24 7 7l5 7 5-7c0-2.76-2.24-5-5-5m0 9L9 7c0-1.66 1.34-3 3-3s3 1.34 3 3z"
}), "Approval");
const ArrowBack$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"
}), "ArrowBack");
const ArrowDownward = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m20 12-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z"
}), "ArrowDownward");
const ArrowForward = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
}), "ArrowForward");
const ArrowForwardIos = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6.23 20.23 8 22l10-10L8 2 6.23 3.77 14.46 12z"
}), "ArrowForwardIos");
const ArrowUpward = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m4 12 1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z"
}), "ArrowUpward");
const Article = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-5 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"
}), "Article");
const Assessment$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M9 17H7v-7h2zm4 0h-2V7h2zm4 0h-2v-4h2z"
}), "Assessment");
const Assignment = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m2 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"
}), "Assignment");
const AttachFile$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6z"
}), "AttachFile");
const AttachMoney$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4"
}), "AttachMoney");
const AweIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z"
}), "AutoAwesome");
const AutoFixHigh$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.9959.9959 0 0 0-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12z"
}), "AutoFixHigh");
const AutorenewIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6m6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26"
}), "Autorenew");
const Backup = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96M14 13v4h-4v-4H7l5-5 5 5z"
}), "Backup");
const Badge = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2M9 12c.83 0 1.5.67 1.5 1.5S9.83 15 9 15s-1.5-.67-1.5-1.5S8.17 12 9 12m3 6H6v-.75c0-1 2-1.5 3-1.5s3 .5 3 1.5zm1-9h-2V4h2zm5 7.5h-4V15h4zm0-3h-4V12h4z"
}), "Badge");
const BarChart = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4 9h4v11H4zm12 4h4v7h-4zm-6-9h4v16h-4z"
}), "BarChart");
const Block = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2M4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12m8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8"
}), "Block");
const Bolt = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21"
}), "Bolt");
const Bookmark = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2"
}), "Bookmark");
const Build$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m22.7 19-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4"
}), "Build");
const Business = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 7V3H2v18h20V7zM6 19H4v-2h2zm0-4H4v-2h2zm0-4H4V9h2zm0-4H4V5h2zm4 12H8v-2h2zm0-4H8v-2h2zm0-4H8V9h2zm0-4H8V5h2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8zm-2-8h-2v2h2zm0 4h-2v2h2z"
}), "Business");
const Calculate = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41zm-6.78.66h5v1.5h-5zM11.5 16h-2v2H8v-2H6v-1.5h2v-2h1.5v2h2zm6.5 1.25h-5v-1.5h5zm0-2.5h-5v-1.5h5z"
}), "Calculate");
const CalendarToday = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 18H4V8h16z"
}), "CalendarToday");
const CallReceived = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 5.41 18.59 4 7 15.59V9H5v10h10v-2H8.41z"
}), "CallReceived");
const CallSplit = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m14 4 2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z"
}), "CallSplit");
const CameraAlt = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "12",
  cy: "12",
  r: "3.2"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5"
}, "1")], "CameraAlt");
const Cancel = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2m5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12z"
}), "Cancel");
const Casino = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18m0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9m4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9"
}), "Casino");
const Category = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m12 2-5.5 9h11z"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "17.5",
  cy: "17.5",
  r: "4.5"
}, "1"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 13.5h8v8H3z"
}, "2")], "Category");
const ChangeCircle = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m.06 17v-2.01H12c-1.28 0-2.56-.49-3.54-1.46-1.71-1.71-1.92-4.35-.64-6.29l1.1 1.1c-.71 1.33-.53 3.01.59 4.13.7.7 1.62 1.03 2.54 1.01v-2.14l2.83 2.83zm4.11-4.24-1.1-1.1c.71-1.33.53-3.01-.59-4.13C13.79 8.84 12.9 8.5 12 8.5h-.06v2.15L9.11 7.83 11.94 5v2.02c1.3-.02 2.61.45 3.6 1.45 1.7 1.7 1.91 4.35.63 6.29"
}), "ChangeCircle");
const Chat = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6zm8 5H6v-2h8zm4-6H6V6h12z"
}), "Chat");
const Check$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
}), "Check");
const CheckCircle$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"
}), "CheckCircle");
const CheckCircleOutline$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), "CheckCircleOutline");
const ChecklistRtl = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 7H2v2h9zm0 8H2v2h9zm5.34-4L12.8 7.46l1.41-1.41 2.12 2.12 4.24-4.24L22 5.34zm0 8-3.54-3.54 1.41-1.41 2.12 2.12 4.24-4.24L22 13.34z"
}), "ChecklistRtl");
const Checkroom = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21.6 18.2 13 11.75v-.91c1.65-.49 2.8-2.17 2.43-4.05-.26-1.31-1.3-2.4-2.61-2.7C10.54 3.57 8.5 5.3 8.5 7.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .84-.69 1.52-1.53 1.5-.54-.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8M6 18l6-4.5 6 4.5z"
}), "Checkroom");
const ChevronRight$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
}), "ChevronRight");
const Clear = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
}), "Clear");
const CloseIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
}), "Close");
const CloseFullscreen = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 3.41 16.71 8.7 20 12h-8V4l3.29 3.29L20.59 2zM3.41 22l5.29-5.29L12 20v-8H4l3.29 3.29L2 20.59z"
}), "CloseFullscreen");
const CloudQueue = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96M19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h.71C7.37 7.69 9.48 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3s-1.34 3-3 3"
}), "CloudQueue");
const CloudUpload = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96M14 13v4h-4v-4H7l5-5 5 5z"
}), "CloudUpload");
const Code = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6z"
}), "Code");
const CompareArrows = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9.01 14H2v2h7.01v3L13 15l-3.99-4zm5.98-1v-3H22V8h-7.01V5L11 9z"
}), "CompareArrows");
const ContactPage = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm-2 8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m4 8H8v-.57c0-.81.48-1.53 1.22-1.85.85-.37 1.79-.58 2.78-.58.99 0 1.93.21 2.78.58.74.32 1.22 1.04 1.22 1.85z"
}), "ContactPage");
const ContentCopy = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"
}), "ContentCopy");
const ContentPaste = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m7 18H5V4h2v3h10V4h2z"
}), "ContentPaste");
const CreditCard = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2m0 14H4v-6h16zm0-10H4V6h16z"
}), "CreditCard");
const CreditCardOff = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21.9 21.9 2.1 2.1.69 3.51l1.55 1.55c-.15.28-.23.6-.23.94L2 18c0 1.11.89 2 2 2h13.17l3.31 3.31zM4 12V8h1.17l4 4zm2.83-8H20c1.11 0 2 .89 2 2v12c0 .34-.08.66-.23.94L14.83 12H20V8h-9.17z"
}), "CreditCardOff");
const DarkMode = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1"
}), "DarkMode");
const DashboardIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
}), "Dashboard");
const Delete$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"
}), "Delete");
const DeleteOutline$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM8 9h8v10H8zm7.5-5-1-1h-5l-1 1H5v2h14V4z"
}), "DeleteOutline");
const DeleteSweep = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3zM14 5h-3l-1-1H6L5 5H2v2h12z"
}), "DeleteSweep");
const Description = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z"
}), "Description");
const DirectionsBoat = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78zM6 6h12v3.97L12 8 6 9.97z"
}), "DirectionsBoat");
const DirectionsCar = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16m11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M5 11l1.5-4.5h11L19 11z"
}), "DirectionsCar");
const DirectionsRailway = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2m6-7H6V5h12z"
}), "DirectionsRailway");
const ScanIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7 3H4v3H2V1h5zm15 3V1h-5v2h3v3zM7 21H4v-3H2v5h5zm13-3v3h-3v2h5v-5zm-1 0c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2zM15 8H9v2h6zm0 3H9v2h6zm0 3H9v2h6z"
}), "DocumentScanner");
const DoneAll = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m18 7-1.41-1.41-6.34 6.34 1.41 1.41zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12zM.41 13.41 6 19l1.41-1.41L1.83 12z"
}), "DoneAll");
const Download = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z"
}), "Download");
const DragIndicator = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2m-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2"
}), "DragIndicator");
const Edit$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"
}), "Edit");
const EditNote = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 10h11v2H3zm0-2h11V6H3zm0 8h7v-2H3zm15.01-3.13.71-.71c.39-.39 1.02-.39 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-.71.71zm-.71.71-5.3 5.3V21h2.12l5.3-5.3z"
}), "EditNote");
const Engineering$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4m13.1-8.16c.01-.11.02-.22.02-.34 0-.12-.01-.23-.03-.34l.74-.58c.07-.05.08-.15.04-.22l-.7-1.21c-.04-.08-.14-.1-.21-.08l-.86.35c-.18-.14-.38-.25-.59-.34l-.13-.93c-.02-.09-.09-.15-.18-.15h-1.4c-.09 0-.16.06-.17.15l-.13.93c-.21.09-.41.21-.59.34l-.87-.35c-.08-.03-.17 0-.21.08l-.7 1.21c-.04.08-.03.17.04.22l.74.58c-.02.11-.03.23-.03.34 0 .11.01.23.03.34l-.74.58c-.07.05-.08.15-.04.22l.7 1.21c.04.08.14.1.21.08l.87-.35c.18.14.38.25.59.34l.13.93c.01.09.08.15.17.15h1.4c.09 0 .16-.06.17-.15l.13-.93c.21-.09.41-.21.59-.34l.87.35c.08.03.17 0 .21-.08l.7-1.21c.04-.08.03-.17-.04-.22zm-2.6.91c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25m.42 3.93-.5-.87c-.03-.06-.1-.08-.15-.06l-.62.25c-.13-.1-.27-.18-.42-.24l-.09-.66c-.02-.06-.08-.1-.14-.1h-1c-.06 0-.11.04-.12.11l-.09.66c-.15.06-.29.15-.42.24l-.62-.25c-.06-.02-.12 0-.15.06l-.5.87c-.03.06-.02.12.03.16l.53.41c-.01.08-.02.16-.02.24 0 .08.01.17.02.24l-.53.41c-.05.04-.06.11-.03.16l.5.87c.03.06.1.08.15.06l.62-.25c.13.1.27.18.42.24l.09.66c.01.07.06.11.12.11h1c.06 0 .12-.04.12-.11l.09-.66c.15-.06.29-.15.42-.24l.62.25c.06.02.12 0 .15-.06l.5-.87c.03-.06.02-.12-.03-.16l-.52-.41c.01-.08.02-.16.02-.24 0-.08-.01-.17-.02-.24l.53-.41c.05-.04.06-.11.04-.17m-2.42 1.65c-.46 0-.83-.38-.83-.83 0-.46.38-.83.83-.83s.83.38.83.83c0 .46-.37.83-.83.83M4.74 9h8.53c.27 0 .49-.22.49-.49v-.02c0-.27-.22-.49-.49-.49H13c0-1.48-.81-2.75-2-3.45v.95c0 .28-.22.5-.5.5s-.5-.22-.5-.5V4.14C9.68 4.06 9.35 4 9 4s-.68.06-1 .14V5.5c0 .28-.22.5-.5.5S7 5.78 7 5.5v-.95C5.81 5.25 5 6.52 5 8h-.26c-.27 0-.49.22-.49.49v.03c0 .26.22.48.49.48M9 13c1.86 0 3.41-1.28 3.86-3H5.14c.45 1.72 2 3 3.86 3"
}), "Engineering");
const Error$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z"
}), "Error");
const ErrorOutline = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), "ErrorOutline");
const EventBusy = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m9.31 17 2.44-2.44L14.19 17l1.06-1.06-2.44-2.44 2.44-2.44L14.19 10l-2.44 2.44L9.31 10l-1.06 1.06 2.44 2.44-2.44 2.44zM19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 16H5V8h14z"
}), "EventBusy");
const EventNote = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 10H7v2h10zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 16H5V8h14zm-5-5H7v2h7z"
}), "EventNote");
const ExpandLess = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"
}), "ExpandLess");
const ExpandMore = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"
}), "ExpandMore");
const FactCheck$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  fillRule: "evenodd",
  d: "M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M10 17H5v-2h5zm0-4H5v-2h5zm0-4H5V7h5zm4.82 6L12 12.16l1.41-1.41 1.41 1.42L17.99 9l1.42 1.42z"
}), "FactCheck");
const Factory$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 10v12H2V10l7-3v2l5-2v3zm-4.8-1.5L18 2h3l.8 6.5zM11 18h2v-4h-2zm-4 0h2v-4H7zm10-4h-2v4h2z"
}), "Factory");
const FiberManualRecord = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "12",
  cy: "12",
  r: "8"
}), "FiberManualRecord");
const FileDownload = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"
}), "FileDownload");
const FileDownloadOutlined = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zm-1-4-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5z"
}), "FileDownloadOutlined");
const FilterAlt = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61"
}), "FilterAlt");
const FilterList = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M10 18h4v-2h-4zM3 6v2h18V6zm3 7h12v-2H6z"
}), "FilterList");
const FlightTakeoff = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M2.5 19h19v2h-19zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49s7.12-1.9 16.57-4.43c.81-.23 1.28-1.05 1.07-1.85"
}), "FlightTakeoff");
const Group = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5"
}), "Group");
const GroupAdd = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 9V7h-2v2h-2v2h2v2h2v-2h2V9zM8 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 1c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4m4.51-8.95C13.43 5.11 14 6.49 14 8s-.57 2.89-1.49 3.95C14.47 11.7 16 10.04 16 8s-1.53-3.7-3.49-3.95m4.02 9.78C17.42 14.66 18 15.7 18 17v3h2v-3c0-1.45-1.59-2.51-3.47-3.17"
}), "GroupAdd");
const Handshake = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16.48 10.41c-.39.39-1.04.39-1.43 0l-4.47-4.46-7.05 7.04-.66-.63c-1.17-1.17-1.17-3.07 0-4.24l4.24-4.24c1.17-1.17 3.07-1.17 4.24 0L16.48 9c.39.39.39 1.02 0 1.41m.7-2.12c.78.78.78 2.05 0 2.83-1.27 1.27-2.61.22-2.83 0l-3.76-3.76-5.57 5.57c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.42 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.42 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l8.32-8.34c1.17-1.17 1.17-3.07 0-4.24l-4.24-4.24c-1.15-1.15-3.01-1.17-4.18-.06z"
}), "Handshake");
const Help = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 17h-2v-2h2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25"
}), "Help");
const HelpOutline = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4"
}), "HelpOutline");
const History$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9m-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z"
}), "History");
const HourglassEmpty = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2zm10 14.5V20H8v-3.5l4-4zm-4-5-4-4V4h8v3.5z"
}), "HourglassEmpty");
const HowToReg = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  fillRule: "evenodd",
  d: "m9 17 3-2.94c-.39-.04-.68-.06-1-.06-2.67 0-8 1.34-8 4v2h9zm2-5c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m4.47 8.5L12 17l1.4-1.41 2.07 2.08 5.13-5.17 1.4 1.41z"
}), "HowToReg");
const Http = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M4.5 11h-2V9H1v6h1.5v-2.5h2V15H6V9H4.5zm2.5-.5h1.5V15H10v-4.5h1.5V9H7zm5.5 0H14V15h1.5v-4.5H17V9h-4.5zm9-1.5H18v6h1.5v-2h2c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5m0 2.5h-2v-1h2z"
}), "Http");
const Hub$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M8.4 18.2c.38.5.6 1.12.6 1.8 0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3c.44 0 .85.09 1.23.26l1.41-1.77c-.92-1.03-1.29-2.39-1.09-3.69l-2.03-.68c-.54.83-1.46 1.38-2.52 1.38-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3c0 .07 0 .14-.01.21l2.03.68c.64-1.21 1.82-2.09 3.22-2.32V5.91C9.96 5.57 9 4.4 9 3c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.4-.96 2.57-2.25 2.91v2.16c1.4.23 2.58 1.11 3.22 2.32L18 9.71V9.5c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3c-1.06 0-1.98-.55-2.52-1.37l-2.03.68c.2 1.29-.16 2.65-1.09 3.69l1.41 1.77c.38-.18.79-.27 1.23-.27 1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3c0-.68.22-1.3.6-1.8l-1.41-1.77c-1.35.75-3.01.76-4.37 0z"
}), "Hub");
const Image$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2M8.5 13.5l2.5 3.01L14.5 12l4.5 6H5z"
}), "Image");
const Info = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"
}), "Info");
const InfoOutlined$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8"
}), "InfoOutlined");
const InsertDriveFile = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z"
}), "InsertDriveFile");
const Insights = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.27 10.45 11.46 9 10 9c-1.45 0-2.27 1.44-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.51l4.55-4.56c.3.09.74.09 1.04 0l2.55 2.55C12.73 16.55 13.54 18 15 18c1.45 0 2.27-1.44 1.93-2.52l3.56-3.55c1.07.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m15 9 .94-2.07L18 6l-2.06-.93L15 3l-.92 2.07L12 6l2.08.93zM3.5 11 4 9l2-.5L4 8l-.5-2L3 8l-2 .5L3 9z"
}, "1")], "Insights");
const Inventory$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4l16-.02z"
}), "Inventory");
const Inventory2$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4h16z"
}), "Inventory2");
const Key = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 10h-8.35C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H13l2 2 2-2 2 2 4-4.04zM7 15c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3"
}), "Key");
const Keyboard = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m-9 3h2v2h-2zm0 3h2v2h-2zM8 8h2v2H8zm0 3h2v2H8zm-1 2H5v-2h2zm0-3H5V8h2zm9 7H8v-2h8zm0-4h-2v-2h2zm0-3h-2V8h2zm3 3h-2v-2h2zm0-3h-2V8h2z"
}), "Keyboard");
const KeyboardArrowDown = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"
}), "KeyboardArrowDown");
const KeyboardArrowLeft = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z"
}), "KeyboardArrowLeft");
const KeyboardArrowRight = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"
}), "KeyboardArrowRight");
const KeyboardArrowUp = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"
}), "KeyboardArrowUp");
const Language = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2m6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56M12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96M4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56m2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8M12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96M14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2m.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56M16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2z"
}), "Language");
const Layers = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27z"
}), "Layers");
const LightMode = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1m18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1M11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1m0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1M5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0z"
}), "LightMode");
const LinkIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5"
}), "Link");
const LinkOff = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5m-1 4h-2.19l2 2H16zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74 3.27 3z"
}), "LinkOff");
const LinkOutlined = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5m-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4zm-3-4h8v2H8z"
}), "LinkOutlined");
const ListAlt = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 5v14H5V5zm1.1-2H3.9c-.5 0-.9.4-.9.9v16.2c0 .4.4.9.9.9h16.2c.4 0 .9-.5.9-.9V3.9c0-.5-.5-.9-.9-.9M11 7h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zM7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7z"
}), "ListAlt");
const LocalShipping = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m13.5-9 1.96 2.5H17V9.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5"
}), "LocalShipping");
const LocationOn = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5"
}), "LocationOn");
const Lock$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2m3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1z"
}), "Lock");
const Login = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8z"
}), "Login");
const Logout = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z"
}), "Logout");
const MenuIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z"
}), "Menu");
const MenuBook$1 = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99M13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.3-4.5.83m4.5 1.84c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24"
}, "1")], "MenuBook");
const MenuOpen = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 18h13v-2H3zm0-5h10v-2H3zm0-7v2h13V6zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5z"
}), "MenuOpen");
const MonetizationOn$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16"
}), "MonetizationOn");
const MoneyOff = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27M5.33 4.06 4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27z"
}), "MoneyOff");
const MoreHoriz = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2"
}), "MoreHoriz");
const MoreVert = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2"
}), "MoreVert");
const MoveToInbox = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H4.99c-1.11 0-1.98.9-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19zm-3-5h-2V7h-4v3H8l4 4z"
}), "MoveToInbox");
const NavigateNext = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
}), "NavigateNext");
const NoteAdd = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3zm-3-7V3.5L18.5 9z"
}), "NoteAdd");
const Notes = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 18h12v-2H3zM3 6v2h18V6zm0 7h18v-2H3z"
}), "Notes");
const Notifications = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2m6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1z"
}), "Notifications");
const OpenInNew = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z"
}), "OpenInNew");
const Outbound = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1.88 9.54L8.92 16.5l-1.41-1.41 4.96-4.96L10.34 8l5.65.01.01 5.65z"
}), "Outbound");
const Outbox = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H4.99c-1.11 0-1.98.9-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19zM8 11h2v3h4v-3h2l-4-4z"
}), "Outbox");
const Palette = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9m5.5 11c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m-3-4c-.83 0-1.5-.67-1.5-1.5S13.67 6 14.5 6s1.5.67 1.5 1.5S15.33 9 14.5 9M5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S7.33 13 6.5 13 5 12.33 5 11.5m6-4c0 .83-.67 1.5-1.5 1.5S8 8.33 8 7.5 8.67 6 9.5 6s1.5.67 1.5 1.5"
}), "Palette");
const Payment$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2m0 14H4v-6h16zm0-10H4V6h16z"
}), "Payment");
const People = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5"
}), "People");
const Person = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"
}), "Person");
const PersonAdd = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m-9-2V7H4v3H1v2h3v3h2v-3h3v-2zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4"
}), "PersonAdd");
const PersonSearch = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "10",
  cy: "8",
  r: "4"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M10.35 14.01C7.62 13.91 2 15.27 2 18v2h9.54c-2.47-2.76-1.23-5.89-1.19-5.99m9.08 4.01c.36-.59.57-1.28.57-2.02 0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.74 0 1.43-.22 2.02-.57L20.59 22 22 20.59zM16 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2"
}, "1")], "PersonSearch");
const PhoneAndroid = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3m-2 20h-4v-1h4zm3.25-3H6.75V4h10.5z"
}), "PhoneAndroid");
const PictureAsPdf = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5zm4-3H19v1h1.5V11H19v2h-1.5V7h3zM9 9.5h1v-1H9zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm10 5.5h1v-3h-1z"
}), "PictureAsPdf");
const PieChart = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10m2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99m0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99z"
}), "PieChart");
const PlayArrow = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M8 5v14l11-7z"
}), "PlayArrow");
const PlaylistAdd = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14 10H3v2h11zm0-4H3v2h11zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2zM3 16h7v-2H3z"
}), "PlaylistAdd");
const PlaylistAddCheck$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm17.59-2.07-4.25 4.24-2.12-2.12-1.41 1.41L16.34 19 22 13.34z"
}), "PlaylistAddCheck");
const PointOfSale = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 2H7c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 4H7V4h10zm3 16H4c-1.1 0-2-.9-2-2v-1h20v1c0 1.1-.9 2-2 2m-1.47-11.81C18.21 9.47 17.49 9 16.7 9H7.3c-.79 0-1.51.47-1.83 1.19L2 18h20zM9.5 16h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m3 4h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m3 4h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5m0-2h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5"
}), "PointOfSale");
const PrecisionManufacturing$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m19.93 8.21-3.6 1.68L14 7.7V6.3l2.33-2.19 3.6 1.68c.38.18.82.01 1-.36.18-.38.01-.82-.36-1L16.65 2.6c-.38-.18-.83-.1-1.13.2l-1.74 1.6c-.18-.24-.46-.4-.78-.4-.55 0-1 .45-1 1v1H8.82C8.34 4.65 6.98 3.73 5.4 4.07c-1.16.25-2.15 1.25-2.36 2.43-.22 1.32.46 2.47 1.48 3.08L7.08 18H4v3h13v-3h-3.62L8.41 8.77c.17-.24.31-.49.41-.77H12v1c0 .55.45 1 1 1 .32 0 .6-.16.78-.4l1.74 1.6c.3.3.75.38 1.13.2l3.92-1.83c.38-.18.54-.62.36-1-.18-.37-.62-.54-1-.36M6 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"
}), "PrecisionManufacturing");
const Print$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3m-3 11H8v-5h8zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m-1-9H6v4h12z"
}), "Print");
const QrCode = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 11h8V3H3zm2-6h4v4H5zM3 21h8v-8H3zm2-6h4v4H5zm8-12v8h8V3zm6 6h-4V5h4zm0 10h2v2h-2zm-6-6h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm0-4h2v2h-2zm2 2h2v2h-2z"
}), "QrCode");
const QrCode2 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15 21h-2v-2h2zm-2-7h-2v5h2zm8-2h-2v4h2zm-2-2h-2v2h2zM7 12H5v2h2zm-2-2H3v2h2zm7-5h2V3h-2zm-7.5-.5v3h3v-3zM9 9H3V3h6zm-4.5 7.5v3h3v-3zM9 21H3v-6h6zm7.5-16.5v3h3v-3zM21 9h-6V3h6zm-2 10v-3h-4v2h2v3h4v-2zm-2-7h-4v2h4zm-4-2H7v2h2v2h2v-2h2zm1-1V7h-2V5h-2v4zM6.75 5.25h-1.5v1.5h1.5zm0 12h-1.5v1.5h1.5zm12-12h-1.5v1.5h1.5z"
}), "QrCode2");
const QueryStats = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.88 18.47c.44-.7.7-1.51.7-2.39 0-2.49-2.01-4.5-4.5-4.5s-4.5 2.01-4.5 4.5 2.01 4.5 4.49 4.5c.88 0 1.7-.26 2.39-.7L21.58 23 23 21.58zm-3.8.11c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5m-.36-8.5c-.74.02-1.45.18-2.1.45l-.55-.83-3.8 6.18-3.01-3.52-3.63 5.81L1 17l5-8 3 3.5L13 6zm2.59.5c-.64-.28-1.33-.45-2.05-.49L21.38 2 23 3.18z"
}), "QueryStats");
const RadioButtonUnchecked$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), "RadioButtonUnchecked");
const RateReview = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 14v-2.47l6.88-6.88c.2-.2.51-.2.71 0l1.77 1.77c.2.2.2.51 0 .71L8.47 14zm12 0h-7.5l2-2H18z"
}), "RateReview");
const ReceiptIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18 17H6v-2h12zm0-4H6v-2h12zm0-4H6V7h12zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2z"
}), "Receipt");
const ReceiptLong = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.5 3.5 18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2zM19 19c0 .55-.45 1-1 1s-1-.45-1-1v-3H8V5h11z"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9 7h6v2H9zm7 0h2v2h-2zm-7 3h6v2H9zm7 0h2v2h-2z"
}, "1")], "ReceiptLong");
const Redo = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7z"
}), "Redo");
const Refresh$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"
}), "Refresh");
const RefreshOutlined = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"
}), "RefreshOutlined");
const Remove = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 13H5v-2h14z"
}), "Remove");
const Replay = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8"
}), "Replay");
const ReportProblem = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"
}), "ReportProblem");
const RequestQuote = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm1 10h-4v1h3c.55 0 1 .45 1 1v3c0 .55-.45 1-1 1h-1v1h-2v-1H9v-2h4v-1h-3c-.55 0-1-.45-1-1v-3c0-.55.45-1 1-1h1V9h2v1h2zm-2-4V3.5L17.5 8z"
}), "RequestQuote");
const RestartAlt$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8m-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91"
}), "RestartAlt");
const Route = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.41-2 1.51-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.3-.84-2.4-2-2.82"
}), "Route");
const Rule = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M16.54 11 13 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41zM11 7H2v2h9zm10 6.41L19.59 12 17 14.59 14.41 12 13 13.41 15.59 16 13 18.59 14.41 20 17 17.41 19.59 20 21 18.59 18.41 16zM11 15H2v2h9z"
}), "Rule");
const Save$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3m3-10H5V5h10z"
}), "Save");
const Savings = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m19.83 7.5-2.27-2.27c.07-.42.18-.81.32-1.15.08-.18.12-.37.12-.58 0-.83-.67-1.5-1.5-1.5-1.64 0-3.09.79-4 2h-5C4.46 4 2 6.46 2 9.5S4.5 21 4.5 21H10v-2h2v2h5.5l1.68-5.59 2.82-.94V7.5zM13 9H8V7h5zm3 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"
}), "Savings");
const Schedule$1 = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
}, "1")], "Schedule");
const Science = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.8 18.4 14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6"
}), "Science");
const Search$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"
}), "Search");
const Security = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11z"
}), "Security");
const Send = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
}), "Send");
const Settings$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6"
}), "Settings");
const Share$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92"
}), "Share");
const CartIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2M1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2"
}), "ShoppingCart");
const SmartToy = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3M7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5M16 17H8v-2h8zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13"
}), "SmartToy");
const SortByAlpha = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14.94 4.66h-4.72l2.36-2.36zm-4.69 14.71h4.66l-2.33 2.33zM6.1 6.27 1.6 17.73h1.84l.92-2.45h5.11l.92 2.45h1.84L7.74 6.27zm-1.13 7.37 1.94-5.18 1.94 5.18zm10.76 2.5h6.12v1.59h-8.53v-1.29l5.92-8.56h-5.88v-1.6h8.3v1.26z"
}), "SortByAlpha");
const Speed = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m20.38 8.57-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83"
}), "Speed");
const Star = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
}), "Star");
const StarRate = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14.43 10 12 2l-2.43 8H2l6.18 4.41L5.83 22 12 17.31 18.18 22l-2.35-7.59L22 10z"
}), "StarRate");
const Stop = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 6h12v12H6z"
}), "Stop");
const Storage = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M2 20h20v-4H2zm2-3h2v2H4zM2 4v4h20V4zm4 3H4V5h2zm-4 7h20v-4H2zm2-3h2v2H4z"
}), "Storage");
const Store = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M20 4H4v2h16zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6zm-9 4H6v-4h6z"
}), "Store");
const Storefront$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m21.9 8.89-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89m-2.99-3.9 1.05 4.37c.1.42.01.84-.25 1.17-.14.18-.44.47-.94.47-.61 0-1.14-.49-1.21-1.14L16.98 5zM13 5h1.96l.54 4.52c.05.39-.07.78-.33 1.07-.22.26-.54.41-.95.41-.67 0-1.22-.59-1.22-1.31zM8.49 9.52 9.04 5H11v4.69c0 .72-.55 1.31-1.29 1.31-.34 0-.65-.15-.89-.41-.25-.29-.37-.68-.33-1.07m-4.45-.16L5.05 5h1.97l-.58 4.86c-.08.65-.6 1.14-1.21 1.14-.49 0-.8-.29-.93-.47-.27-.32-.36-.75-.26-1.17M5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19z"
}), "Storefront");
const SubdirectoryArrowRight = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m19 15-6 6-1.42-1.42L15.17 16H4V4h2v10h9.17l-3.59-3.58L13 9z"
}), "SubdirectoryArrowRight");
const Summarize = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M15 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V9zM8 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m0-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m0-4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m6 1V4.5l5.5 5.5z"
}), "Summarize");
const Support = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m7.46 7.12-2.78 1.15c-.51-1.36-1.58-2.44-2.95-2.94l1.15-2.78c2.1.8 3.77 2.47 4.58 4.57M12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M9.13 4.54l1.17 2.78c-1.38.5-2.47 1.59-2.98 2.97L4.54 9.13c.81-2.11 2.48-3.78 4.59-4.59M4.54 14.87l2.78-1.15c.51 1.38 1.59 2.46 2.97 2.96l-1.17 2.78c-2.1-.81-3.77-2.48-4.58-4.59m10.34 4.59-1.15-2.78c1.37-.51 2.45-1.59 2.95-2.97l2.78 1.17c-.81 2.1-2.48 3.77-4.58 4.58"
}), "Support");
const SupportAgent = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28-.6.34-1 .98-1 1.72v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "9",
  cy: "13",
  r: "1"
}, "1"), /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
  cx: "15",
  cy: "13",
  r: "1"
}, "2"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M18 11.03C17.52 8.18 15.04 6 12.05 6c-3.03 0-6.29 2.51-6.03 6.45 2.47-1.01 4.33-3.21 4.86-5.89 1.31 2.63 4 4.44 7.12 4.47"
}, "3")], "SupportAgent");
const SwapHoriz$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6.99 11 3 15l3.99 4v-3H14v-2H6.99zM21 9l-3.99-4v3H10v2h7.01v3z"
}), "SwapHoriz");
const Sync = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8m0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4z"
}), "Sync");
const TaskAlt = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 5.18 10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44C16.1 2.67 14.13 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39z"
}), "TaskAlt");
const ThumbUp = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M1 21h4V9H1zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73z"
}), "ThumbUp");
const TimelineIcon = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2"
}), "Timeline");
const Timer = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M9 1h6v2H9zm10.03 6.39 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61M13 14h-2V8h2z"
}), "Timer");
const TrackChanges = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m19.07 4.93-1.41 1.41C19.1 7.79 20 9.79 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8c0-4.08 3.05-7.44 7-7.93v2.02C8.16 6.57 6 9.03 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-1.66-.67-3.16-1.76-4.24l-1.41 1.41C15.55 9.9 16 10.9 16 12c0 2.21-1.79 4-4 4s-4-1.79-4-4c0-1.86 1.28-3.41 3-3.86v2.14c-.6.35-1 .98-1 1.72 0 1.1.9 2 2 2s2-.9 2-2c0-.74-.4-1.38-1-1.72V2h-1C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-2.76-1.12-5.26-2.93-7.07"
}), "TrackChanges");
const Translate = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2zm-2.62 7 1.62-4.33L19.12 17z"
}), "Translate");
const TrendingDown = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m16 18 2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z"
}), "TrendingDown");
const TrendingUp$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"
}), "TrendingUp");
const Tune = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z"
}), "Tune");
const Undo = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"
}), "Undo");
const Upload = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M5 20h14v-2H5zm0-10h4v6h6v-6h4l-7-7z"
}), "Upload");
const VerifiedUser = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z"
}), "VerifiedUser");
const ViewColumn = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M14.67 5v14H9.33V5zm1 14H21V5h-5.33zm-7.34 0V5H3v14z"
}), "ViewColumn");
const ViewList = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M3 14h4v-4H3zm0 5h4v-4H3zM3 9h4V5H3zm5 5h13v-4H8zm0 5h13v-4H8zM8 5v4h13V5z"
}), "ViewList");
const ViewTimeline$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H6v-2h6zm3-4H9v-2h6zm3-4h-6V7h6z"
}), "ViewTimeline");
const Visibility$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"
}), "Visibility");
const VisibilityOff = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7M2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2m4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3z"
}), "VisibilityOff");
const Warehouse$1 = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M22 21V7L12 3 2 7v14h5v-9h10v9zm-11-2H9v2h2zm2-3h-2v2h2zm2 3h-2v2h2z"
}), "Warehouse");
const Warning = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"
}), "Warning");
const WarningAmber$1 = createSvgIcon$1([/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 5.99 19.53 19H4.47zM12 2 1 21h22z"
}, "0"), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M13 16h-2v2h2zm0-6h-2v5h2z"
}, "1")], "WarningAmber");
const WarningAmberOutlined = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M12 5.99 19.53 19H4.47zM12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z"
}), "WarningAmberOutlined");
const Workspaces = createSvgIcon$1(/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
  d: "M6 13c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4m6-10C9.8 3 8 4.8 8 7s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4m6 10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4"
}), "Workspaces");
const TimelineContext = /* @__PURE__ */ reactExports.createContext({});
function getTimelineUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimeline", slot);
}
generateUtilityClasses("MuiTimeline", ["root", "positionLeft", "positionRight", "positionAlternate", "positionAlternateReverse"]);
function convertTimelinePositionToClass(position2) {
  return position2 === "alternate-reverse" ? "positionAlternateReverse" : `position${capitalize$1(position2)}`;
}
const _excluded$7 = ["position", "className"];
const useUtilityClasses$7 = (ownerState) => {
  const {
    position: position2,
    classes
  } = ownerState;
  const slots = {
    root: ["root", position2 && convertTimelinePositionToClass(position2)]
  };
  return composeClasses(slots, getTimelineUtilityClass, classes);
};
const TimelineRoot = styled("ul", {
  name: "MuiTimeline",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, ownerState.position && styles2[convertTimelinePositionToClass(ownerState.position)]];
  }
})({
  display: "flex",
  flexDirection: "column",
  padding: "6px 16px",
  flexGrow: 1
});
const Timeline$1 = /* @__PURE__ */ reactExports.forwardRef(function Timeline2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimeline"
  });
  const {
    position: position2 = "right",
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$7);
  const ownerState = _extends({}, props, {
    position: position2
  });
  const classes = useUtilityClasses$7(ownerState);
  const contextValue = reactExports.useMemo(() => ({
    position: position2
  }), [position2]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineContext.Provider, {
    value: contextValue,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineRoot, _extends({
      className: clsx(classes.root, className),
      ownerState,
      ref
    }, other))
  });
});
function getTimelineConnectorUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineConnector", slot);
}
generateUtilityClasses("MuiTimelineConnector", ["root"]);
const _excluded$6 = ["className"];
const useUtilityClasses$6 = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTimelineConnectorUtilityClass, classes);
};
const TimelineConnectorRoot = styled("span", {
  name: "MuiTimelineConnector",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})(({
  theme
}) => {
  return {
    width: 2,
    backgroundColor: (theme.vars || theme).palette.grey[400],
    flexGrow: 1
  };
});
const TimelineConnector = /* @__PURE__ */ reactExports.forwardRef(function TimelineConnector2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineConnector"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$6);
  const ownerState = props;
  const classes = useUtilityClasses$6(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineConnectorRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getTimelineContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineContent", slot);
}
const timelineContentClasses = generateUtilityClasses("MuiTimelineContent", ["root", "positionLeft", "positionRight", "positionAlternate", "positionAlternateReverse"]);
const _excluded$5 = ["className"];
const useUtilityClasses$5 = (ownerState) => {
  const {
    position: position2,
    classes
  } = ownerState;
  const slots = {
    root: ["root", convertTimelinePositionToClass(position2)]
  };
  return composeClasses(slots, getTimelineContentUtilityClass, classes);
};
const TimelineContentRoot = styled(Typography, {
  name: "MuiTimelineContent",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[convertTimelinePositionToClass(ownerState.position)]];
  }
})(({
  ownerState
}) => _extends({
  flex: 1,
  padding: "6px 16px",
  textAlign: "left"
}, ownerState.position === "left" && {
  textAlign: "right"
}));
const TimelineContent = /* @__PURE__ */ reactExports.forwardRef(function TimelineContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineContent"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$5);
  const {
    position: positionContext
  } = reactExports.useContext(TimelineContext);
  const ownerState = _extends({}, props, {
    position: positionContext || "right"
  });
  const classes = useUtilityClasses$5(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineContentRoot, _extends({
    component: "div",
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getTimelineDotUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineDot", slot);
}
generateUtilityClasses("MuiTimelineDot", ["root", "filled", "outlined", "filledGrey", "outlinedGrey", "filledPrimary", "outlinedPrimary", "filledSecondary", "outlinedSecondary"]);
const _excluded$4 = ["className", "color", "variant"];
const useUtilityClasses$4 = (ownerState) => {
  const {
    color: color2,
    variant,
    classes
  } = ownerState;
  const slots = {
    root: ["root", variant, color2 !== "inherit" && `${variant}${capitalize$1(color2)}`]
  };
  return composeClasses(slots, getTimelineDotUtilityClass, classes);
};
const TimelineDotRoot = styled("span", {
  name: "MuiTimelineDot",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[ownerState.color !== "inherit" && `${ownerState.variant}${capitalize$1(ownerState.color)}`], styles2[ownerState.variant]];
  }
})(({
  ownerState,
  theme
}) => _extends({
  display: "flex",
  alignSelf: "baseline",
  borderStyle: "solid",
  borderWidth: 2,
  padding: 4,
  borderRadius: "50%",
  boxShadow: (theme.vars || theme).shadows[1],
  margin: "11.5px 0"
}, ownerState.variant === "filled" && _extends({
  borderColor: "transparent"
}, ownerState.color !== "inherit" && _extends({}, ownerState.color === "grey" ? {
  color: (theme.vars || theme).palette.grey[50],
  backgroundColor: (theme.vars || theme).palette.grey[400]
} : {
  color: (theme.vars || theme).palette[ownerState.color].contrastText,
  backgroundColor: (theme.vars || theme).palette[ownerState.color].main
})), ownerState.variant === "outlined" && _extends({
  boxShadow: "none",
  backgroundColor: "transparent"
}, ownerState.color !== "inherit" && _extends({}, ownerState.color === "grey" ? {
  borderColor: (theme.vars || theme).palette.grey[400]
} : {
  borderColor: (theme.vars || theme).palette[ownerState.color].main
}))));
const TimelineDot = /* @__PURE__ */ reactExports.forwardRef(function TimelineDot2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineDot"
  });
  const {
    className,
    color: color2 = "grey",
    variant = "filled"
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$4);
  const ownerState = _extends({}, props, {
    color: color2,
    variant
  });
  const classes = useUtilityClasses$4(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineDotRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
function getTimelineOppositeContentUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineOppositeContent", slot);
}
const timelineOppositeContentClasses = generateUtilityClasses("MuiTimelineOppositeContent", ["root", "positionLeft", "positionRight", "positionAlternate", "positionAlternateReverse"]);
const _excluded$3 = ["className"];
const useUtilityClasses$3 = (ownerState) => {
  const {
    position: position2,
    classes
  } = ownerState;
  const slots = {
    root: ["root", convertTimelinePositionToClass(position2)]
  };
  return composeClasses(slots, getTimelineOppositeContentUtilityClass, classes);
};
const TimelineOppositeContentRoot = styled(Typography, {
  name: "MuiTimelineOppositeContent",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[convertTimelinePositionToClass(ownerState.position)]];
  }
})(({
  ownerState
}) => _extends({
  padding: "6px 16px",
  marginRight: "auto",
  textAlign: "right",
  flex: 1
}, ownerState.position === "left" && {
  textAlign: "left"
}));
const TimelineOppositeContent = /* @__PURE__ */ reactExports.forwardRef(function TimelineOppositeContent2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineOppositeContent"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$3);
  const {
    position: positionContext
  } = reactExports.useContext(TimelineContext);
  const ownerState = _extends({}, props, {
    position: positionContext || "left"
  });
  const classes = useUtilityClasses$3(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineOppositeContentRoot, _extends({
    component: "div",
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
TimelineOppositeContent.muiName = "TimelineOppositeContent";
function getTimelineItemUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineItem", slot);
}
generateUtilityClasses("MuiTimelineItem", ["root", "positionLeft", "positionRight", "positionAlternate", "positionAlternateReverse", "missingOppositeContent"]);
const _excluded$2 = ["position", "className"];
const useUtilityClasses$2 = (ownerState) => {
  const {
    position: position2,
    classes,
    hasOppositeContent
  } = ownerState;
  const slots = {
    root: ["root", convertTimelinePositionToClass(position2), !hasOppositeContent && "missingOppositeContent"]
  };
  return composeClasses(slots, getTimelineItemUtilityClass, classes);
};
const TimelineItemRoot = styled("li", {
  name: "MuiTimelineItem",
  slot: "Root",
  overridesResolver: (props, styles2) => {
    const {
      ownerState
    } = props;
    return [styles2.root, styles2[convertTimelinePositionToClass(ownerState.position)]];
  }
})(({
  ownerState
}) => _extends({
  listStyle: "none",
  display: "flex",
  position: "relative",
  minHeight: 70
}, ownerState.position === "left" && {
  flexDirection: "row-reverse"
}, (ownerState.position === "alternate" || ownerState.position === "alternate-reverse") && {
  [`&:nth-of-type(${ownerState.position === "alternate" ? "even" : "odd"})`]: {
    flexDirection: "row-reverse",
    [`& .${timelineContentClasses.root}`]: {
      textAlign: "right"
    },
    [`& .${timelineOppositeContentClasses.root}`]: {
      textAlign: "left"
    }
  }
}, !ownerState.hasOppositeContent && {
  "&::before": {
    content: '""',
    flex: 1,
    padding: "6px 16px"
  }
}));
const TimelineItem = /* @__PURE__ */ reactExports.forwardRef(function TimelineItem2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineItem"
  });
  const {
    position: positionProp,
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$2);
  const {
    position: positionContext
  } = reactExports.useContext(TimelineContext);
  let hasOppositeContent = false;
  reactExports.Children.forEach(props.children, (child) => {
    if (isMuiElement(child, ["TimelineOppositeContent"])) {
      hasOppositeContent = true;
    }
  });
  const ownerState = _extends({}, props, {
    position: positionProp || positionContext || "right",
    hasOppositeContent
  });
  const classes = useUtilityClasses$2(ownerState);
  const contextValue = reactExports.useMemo(() => ({
    position: ownerState.position
  }), [ownerState.position]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineContext.Provider, {
    value: contextValue,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineItemRoot, _extends({
      className: clsx(classes.root, className),
      ownerState,
      ref
    }, other))
  });
});
function getTimelineSeparatorUtilityClass(slot) {
  return generateUtilityClass$2("MuiTimelineSeparator", slot);
}
generateUtilityClasses("MuiTimelineSeparator", ["root"]);
const _excluded$1 = ["className"];
const useUtilityClasses$1 = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getTimelineSeparatorUtilityClass, classes);
};
const TimelineSeparatorRoot = styled("div", {
  name: "MuiTimelineSeparator",
  slot: "Root",
  overridesResolver: (props, styles2) => styles2.root
})({
  display: "flex",
  flexDirection: "column",
  flex: 0,
  alignItems: "center"
});
const TimelineSeparator = /* @__PURE__ */ reactExports.forwardRef(function TimelineSeparator2(inProps, ref) {
  const props = useThemeProps$a({
    props: inProps,
    name: "MuiTimelineSeparator"
  });
  const {
    className
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1);
  const ownerState = props;
  const classes = useUtilityClasses$1(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineSeparatorRoot, _extends({
    className: clsx(classes.root, className),
    ownerState,
    ref
  }, other));
});
var InfoOutlined = {};
var createSvgIcon = {};
const require$$0 = /* @__PURE__ */ getAugmentedNamespace(utils);
var hasRequiredCreateSvgIcon;
function requireCreateSvgIcon() {
  if (hasRequiredCreateSvgIcon) return createSvgIcon;
  hasRequiredCreateSvgIcon = 1;
  (function(exports) {
    "use client";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "default", {
      enumerable: true,
      get: function() {
        return _utils.createSvgIcon;
      }
    });
    var _utils = require$$0;
  })(createSvgIcon);
  return createSvgIcon;
}
var _interopRequireDefault$W = interopRequireDefaultExports;
Object.defineProperty(InfoOutlined, "__esModule", {
  value: true
});
var default_1$W = InfoOutlined.default = void 0;
var _createSvgIcon$W = _interopRequireDefault$W(requireCreateSvgIcon());
var _jsxRuntime$W = jsxRuntimeExports;
default_1$W = InfoOutlined.default = (0, _createSvgIcon$W.default)(/* @__PURE__ */ (0, _jsxRuntime$W.jsx)("path", {
  d: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8"
}), "InfoOutlined");
var AttachFile = {};
var _interopRequireDefault$V = interopRequireDefaultExports;
Object.defineProperty(AttachFile, "__esModule", {
  value: true
});
var default_1$V = AttachFile.default = void 0;
var _createSvgIcon$V = _interopRequireDefault$V(requireCreateSvgIcon());
var _jsxRuntime$V = jsxRuntimeExports;
default_1$V = AttachFile.default = (0, _createSvgIcon$V.default)(/* @__PURE__ */ (0, _jsxRuntime$V.jsx)("path", {
  d: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6z"
}), "AttachFile");
var Print = {};
var _interopRequireDefault$U = interopRequireDefaultExports;
Object.defineProperty(Print, "__esModule", {
  value: true
});
var default_1$U = Print.default = void 0;
var _createSvgIcon$U = _interopRequireDefault$U(requireCreateSvgIcon());
var _jsxRuntime$U = jsxRuntimeExports;
default_1$U = Print.default = (0, _createSvgIcon$U.default)(/* @__PURE__ */ (0, _jsxRuntime$U.jsx)("path", {
  d: "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3m-3 11H8v-5h8zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m-1-9H6v4h12z"
}), "Print");
var Visibility = {};
var _interopRequireDefault$T = interopRequireDefaultExports;
Object.defineProperty(Visibility, "__esModule", {
  value: true
});
var default_1$T = Visibility.default = void 0;
var _createSvgIcon$T = _interopRequireDefault$T(requireCreateSvgIcon());
var _jsxRuntime$T = jsxRuntimeExports;
default_1$T = Visibility.default = (0, _createSvgIcon$T.default)(/* @__PURE__ */ (0, _jsxRuntime$T.jsx)("path", {
  d: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"
}), "Visibility");
function getContainer(container) {
  return typeof container === "function" ? container() : container;
}
const Portal = /* @__PURE__ */ reactExports.forwardRef(function Portal22(props, forwardedRef) {
  const {
    children,
    container,
    disablePortal = false
  } = props;
  const [mountNode, setMountNode] = reactExports.useState(null);
  const handleRef = useForkRef(/* @__PURE__ */ reactExports.isValidElement(children) ? getReactElementRef(children) : null, forwardedRef);
  useEnhancedEffect(() => {
    if (!disablePortal) {
      setMountNode(getContainer(container) || document.body);
    }
  }, [container, disablePortal]);
  useEnhancedEffect(() => {
    if (mountNode && !disablePortal) {
      setRef(forwardedRef, mountNode);
      return () => {
        setRef(forwardedRef, null);
      };
    }
    return void 0;
  }, [forwardedRef, mountNode, disablePortal]);
  if (disablePortal) {
    if (/* @__PURE__ */ reactExports.isValidElement(children)) {
      const newProps = {
        ref: handleRef
      };
      return /* @__PURE__ */ reactExports.cloneElement(children, newProps);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
      children
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: mountNode ? /* @__PURE__ */ reactDomExports.createPortal(children, mountNode) : mountNode
  });
});
const GLOBAL_CLASS_PREFIX = "base";
function buildStateClass(state) {
  return `${GLOBAL_CLASS_PREFIX}--${state}`;
}
function buildSlotClass(componentName, slot) {
  return `${GLOBAL_CLASS_PREFIX}-${componentName}-${slot}`;
}
function generateUtilityClass(componentName, slot) {
  const globalStateClass = globalStateClasses[slot];
  return globalStateClass ? buildStateClass(globalStateClass) : buildSlotClass(componentName, slot);
}
const COMPONENT_NAME = "Popper";
function getPopperUtilityClass(slot) {
  return generateUtilityClass(COMPONENT_NAME, slot);
}
const _excluded = ["anchorEl", "children", "direction", "disablePortal", "modifiers", "open", "placement", "popperOptions", "popperRef", "slotProps", "slots", "TransitionProps", "ownerState"], _excluded2 = ["anchorEl", "children", "container", "direction", "disablePortal", "keepMounted", "modifiers", "open", "placement", "popperOptions", "popperRef", "style", "transition", "slotProps", "slots"];
function flipPlacement(placement, direction) {
  if (direction === "ltr") {
    return placement;
  }
  switch (placement) {
    case "bottom-end":
      return "bottom-start";
    case "bottom-start":
      return "bottom-end";
    case "top-end":
      return "top-start";
    case "top-start":
      return "top-end";
    default:
      return placement;
  }
}
function resolveAnchorEl(anchorEl) {
  return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}
function isHTMLElement(element) {
  return element.nodeType !== void 0;
}
const useUtilityClasses = () => {
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, useClassNamesOverride$1(getPopperUtilityClass));
};
const defaultPopperOptions = {};
const PopperTooltip = /* @__PURE__ */ reactExports.forwardRef(function PopperTooltip22(props, forwardedRef) {
  var _slots$root;
  const {
    anchorEl,
    children,
    direction,
    disablePortal,
    modifiers,
    open,
    placement: initialPlacement,
    popperOptions,
    popperRef: popperRefProp,
    slotProps = {},
    slots = {},
    TransitionProps
    // @ts-ignore internal logic
    // prevent from spreading to DOM, it can come from the parent component e.g. Select.
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded);
  const tooltipRef = reactExports.useRef(null);
  const ownRef = useForkRef(tooltipRef, forwardedRef);
  const popperRef = reactExports.useRef(null);
  const handlePopperRef = useForkRef(popperRef, popperRefProp);
  const handlePopperRefRef = reactExports.useRef(handlePopperRef);
  useEnhancedEffect(() => {
    handlePopperRefRef.current = handlePopperRef;
  }, [handlePopperRef]);
  reactExports.useImperativeHandle(popperRefProp, () => popperRef.current, []);
  const rtlPlacement = flipPlacement(initialPlacement, direction);
  const [placement, setPlacement] = reactExports.useState(rtlPlacement);
  const [resolvedAnchorElement, setResolvedAnchorElement] = reactExports.useState(resolveAnchorEl(anchorEl));
  reactExports.useEffect(() => {
    if (popperRef.current) {
      popperRef.current.forceUpdate();
    }
  });
  reactExports.useEffect(() => {
    if (anchorEl) {
      setResolvedAnchorElement(resolveAnchorEl(anchorEl));
    }
  }, [anchorEl]);
  useEnhancedEffect(() => {
    if (!resolvedAnchorElement || !open) {
      return void 0;
    }
    const handlePopperUpdate = (data) => {
      setPlacement(data.placement);
    };
    let popperModifiers = [{
      name: "preventOverflow",
      options: {
        altBoundary: disablePortal
      }
    }, {
      name: "flip",
      options: {
        altBoundary: disablePortal
      }
    }, {
      name: "onUpdate",
      enabled: true,
      phase: "afterWrite",
      fn: ({
        state
      }) => {
        handlePopperUpdate(state);
      }
    }];
    if (modifiers != null) {
      popperModifiers = popperModifiers.concat(modifiers);
    }
    if (popperOptions && popperOptions.modifiers != null) {
      popperModifiers = popperModifiers.concat(popperOptions.modifiers);
    }
    const popper = createPopper(resolvedAnchorElement, tooltipRef.current, _extends({
      placement: rtlPlacement
    }, popperOptions, {
      modifiers: popperModifiers
    }));
    handlePopperRefRef.current(popper);
    return () => {
      popper.destroy();
      handlePopperRefRef.current(null);
    };
  }, [resolvedAnchorElement, disablePortal, modifiers, open, popperOptions, rtlPlacement]);
  const childProps = {
    placement
  };
  if (TransitionProps !== null) {
    childProps.TransitionProps = TransitionProps;
  }
  const classes = useUtilityClasses();
  const Root = (_slots$root = slots.root) != null ? _slots$root : "div";
  const rootProps = useSlotProps$1({
    elementType: Root,
    externalSlotProps: slotProps.root,
    externalForwardedProps: other,
    additionalProps: {
      role: "tooltip",
      ref: ownRef
    },
    ownerState: props,
    className: classes.root
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, _extends({}, rootProps, {
    children: typeof children === "function" ? children(childProps) : children
  }));
});
const Popper = /* @__PURE__ */ reactExports.forwardRef(function Popper23(props, forwardedRef) {
  const {
    anchorEl,
    children,
    container: containerProp,
    direction = "ltr",
    disablePortal = false,
    keepMounted = false,
    modifiers,
    open,
    placement = "bottom",
    popperOptions = defaultPopperOptions,
    popperRef,
    style: style2,
    transition = false,
    slotProps = {},
    slots = {}
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded2);
  const [exited, setExited] = reactExports.useState(true);
  const handleEnter = () => {
    setExited(false);
  };
  const handleExited = () => {
    setExited(true);
  };
  if (!keepMounted && !open && (!transition || exited)) {
    return null;
  }
  let container;
  if (containerProp) {
    container = containerProp;
  } else if (anchorEl) {
    const resolvedAnchorEl = resolveAnchorEl(anchorEl);
    container = resolvedAnchorEl && isHTMLElement(resolvedAnchorEl) ? ownerDocument(resolvedAnchorEl).body : ownerDocument(null).body;
  }
  const display = !open && keepMounted && (!transition || exited) ? "none" : void 0;
  const transitionProps = transition ? {
    in: open,
    onEnter: handleEnter,
    onExited: handleExited
  } : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, {
    disablePortal,
    container,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(PopperTooltip, _extends({
      anchorEl,
      direction,
      disablePortal,
      modifiers,
      ref: forwardedRef,
      open: transition ? !exited : open,
      placement,
      popperOptions,
      popperRef,
      slotProps,
      slots
    }, other, {
      style: _extends({
        // Prevents scroll issue, waiting for Popper.js to add this style once initiated.
        position: "fixed",
        // Fix Popper.js display issue
        top: 0,
        left: 0,
        display
      }, style2),
      TransitionProps: transitionProps,
      children
    }))
  });
});
function NoSsr(props) {
  const {
    children,
    defer = false,
    fallback = null
  } = props;
  const [mountedState, setMountedState] = reactExports.useState(false);
  useEnhancedEffect(() => {
    if (!defer) {
      setMountedState(true);
    }
  }, [defer]);
  reactExports.useEffect(() => {
    if (defer) {
      setMountedState(true);
    }
  }, [defer]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: mountedState ? children : fallback
  });
}
var Search = {};
var _interopRequireDefault$S = interopRequireDefaultExports;
Object.defineProperty(Search, "__esModule", {
  value: true
});
var default_1$S = Search.default = void 0;
var _createSvgIcon$S = _interopRequireDefault$S(requireCreateSvgIcon());
var _jsxRuntime$S = jsxRuntimeExports;
default_1$S = Search.default = (0, _createSvgIcon$S.default)(/* @__PURE__ */ (0, _jsxRuntime$S.jsx)("path", {
  d: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"
}), "Search");
var MenuBook = {};
var _interopRequireDefault$R = interopRequireDefaultExports;
Object.defineProperty(MenuBook, "__esModule", {
  value: true
});
var default_1$R = MenuBook.default = void 0;
var _createSvgIcon$R = _interopRequireDefault$R(requireCreateSvgIcon());
var _jsxRuntime$R = jsxRuntimeExports;
default_1$R = MenuBook.default = (0, _createSvgIcon$R.default)([/* @__PURE__ */ (0, _jsxRuntime$R.jsx)("path", {
  d: "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z"
}, "0"), /* @__PURE__ */ (0, _jsxRuntime$R.jsx)("path", {
  d: "M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99M13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.3-4.5.83m4.5 1.84c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24"
}, "1")], "MenuBook");
var Dashboard = {};
var _interopRequireDefault$Q = interopRequireDefaultExports;
Object.defineProperty(Dashboard, "__esModule", {
  value: true
});
var default_1$Q = Dashboard.default = void 0;
var _createSvgIcon$Q = _interopRequireDefault$Q(requireCreateSvgIcon());
var _jsxRuntime$Q = jsxRuntimeExports;
default_1$Q = Dashboard.default = (0, _createSvgIcon$Q.default)(/* @__PURE__ */ (0, _jsxRuntime$Q.jsx)("path", {
  d: "M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"
}), "Dashboard");
var Inventory2 = {};
var _interopRequireDefault$P = interopRequireDefaultExports;
Object.defineProperty(Inventory2, "__esModule", {
  value: true
});
var default_1$P = Inventory2.default = void 0;
var _createSvgIcon$P = _interopRequireDefault$P(requireCreateSvgIcon());
var _jsxRuntime$P = jsxRuntimeExports;
default_1$P = Inventory2.default = (0, _createSvgIcon$P.default)(/* @__PURE__ */ (0, _jsxRuntime$P.jsx)("path", {
  d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4h16z"
}), "Inventory2");
var Storefront = {};
var _interopRequireDefault$O = interopRequireDefaultExports;
Object.defineProperty(Storefront, "__esModule", {
  value: true
});
var default_1$O = Storefront.default = void 0;
var _createSvgIcon$O = _interopRequireDefault$O(requireCreateSvgIcon());
var _jsxRuntime$O = jsxRuntimeExports;
default_1$O = Storefront.default = (0, _createSvgIcon$O.default)(/* @__PURE__ */ (0, _jsxRuntime$O.jsx)("path", {
  d: "m21.9 8.89-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89m-2.99-3.9 1.05 4.37c.1.42.01.84-.25 1.17-.14.18-.44.47-.94.47-.61 0-1.14-.49-1.21-1.14L16.98 5zM13 5h1.96l.54 4.52c.05.39-.07.78-.33 1.07-.22.26-.54.41-.95.41-.67 0-1.22-.59-1.22-1.31zM8.49 9.52 9.04 5H11v4.69c0 .72-.55 1.31-1.29 1.31-.34 0-.65-.15-.89-.41-.25-.29-.37-.68-.33-1.07m-4.45-.16L5.05 5h1.97l-.58 4.86c-.08.65-.6 1.14-1.21 1.14-.49 0-.8-.29-.93-.47-.27-.32-.36-.75-.26-1.17M5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19z"
}), "Storefront");
var ShoppingCart = {};
var _interopRequireDefault$N = interopRequireDefaultExports;
Object.defineProperty(ShoppingCart, "__esModule", {
  value: true
});
var default_1$N = ShoppingCart.default = void 0;
var _createSvgIcon$N = _interopRequireDefault$N(requireCreateSvgIcon());
var _jsxRuntime$N = jsxRuntimeExports;
default_1$N = ShoppingCart.default = (0, _createSvgIcon$N.default)(/* @__PURE__ */ (0, _jsxRuntime$N.jsx)("path", {
  d: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2M1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2"
}), "ShoppingCart");
var MonetizationOn = {};
var _interopRequireDefault$M = interopRequireDefaultExports;
Object.defineProperty(MonetizationOn, "__esModule", {
  value: true
});
var default_1$M = MonetizationOn.default = void 0;
var _createSvgIcon$M = _interopRequireDefault$M(requireCreateSvgIcon());
var _jsxRuntime$M = jsxRuntimeExports;
default_1$M = MonetizationOn.default = (0, _createSvgIcon$M.default)(/* @__PURE__ */ (0, _jsxRuntime$M.jsx)("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16"
}), "MonetizationOn");
var Warehouse = {};
var _interopRequireDefault$L = interopRequireDefaultExports;
Object.defineProperty(Warehouse, "__esModule", {
  value: true
});
var default_1$L = Warehouse.default = void 0;
var _createSvgIcon$L = _interopRequireDefault$L(requireCreateSvgIcon());
var _jsxRuntime$L = jsxRuntimeExports;
default_1$L = Warehouse.default = (0, _createSvgIcon$L.default)(/* @__PURE__ */ (0, _jsxRuntime$L.jsx)("path", {
  d: "M22 21V7L12 3 2 7v14h5v-9h10v9zm-11-2H9v2h2zm2-3h-2v2h2zm2 3h-2v2h2z"
}), "Warehouse");
var PrecisionManufacturing = {};
var _interopRequireDefault$K = interopRequireDefaultExports;
Object.defineProperty(PrecisionManufacturing, "__esModule", {
  value: true
});
var default_1$K = PrecisionManufacturing.default = void 0;
var _createSvgIcon$K = _interopRequireDefault$K(requireCreateSvgIcon());
var _jsxRuntime$K = jsxRuntimeExports;
default_1$K = PrecisionManufacturing.default = (0, _createSvgIcon$K.default)(/* @__PURE__ */ (0, _jsxRuntime$K.jsx)("path", {
  d: "m19.93 8.21-3.6 1.68L14 7.7V6.3l2.33-2.19 3.6 1.68c.38.18.82.01 1-.36.18-.38.01-.82-.36-1L16.65 2.6c-.38-.18-.83-.1-1.13.2l-1.74 1.6c-.18-.24-.46-.4-.78-.4-.55 0-1 .45-1 1v1H8.82C8.34 4.65 6.98 3.73 5.4 4.07c-1.16.25-2.15 1.25-2.36 2.43-.22 1.32.46 2.47 1.48 3.08L7.08 18H4v3h13v-3h-3.62L8.41 8.77c.17-.24.31-.49.41-.77H12v1c0 .55.45 1 1 1 .32 0 .6-.16.78-.4l1.74 1.6c.3.3.75.38 1.13.2l3.92-1.83c.38-.18.54-.62.36-1-.18-.37-.62-.54-1-.36M6 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"
}), "PrecisionManufacturing");
var FactCheck = {};
var _interopRequireDefault$J = interopRequireDefaultExports;
Object.defineProperty(FactCheck, "__esModule", {
  value: true
});
var default_1$J = FactCheck.default = void 0;
var _createSvgIcon$J = _interopRequireDefault$J(requireCreateSvgIcon());
var _jsxRuntime$J = jsxRuntimeExports;
default_1$J = FactCheck.default = (0, _createSvgIcon$J.default)(/* @__PURE__ */ (0, _jsxRuntime$J.jsx)("path", {
  fillRule: "evenodd",
  d: "M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M10 17H5v-2h5zm0-4H5v-2h5zm0-4H5V7h5zm4.82 6L12 12.16l1.41-1.41 1.41 1.42L17.99 9l1.42 1.42z"
}), "FactCheck");
var AccountBalance = {};
var _interopRequireDefault$I = interopRequireDefaultExports;
Object.defineProperty(AccountBalance, "__esModule", {
  value: true
});
var default_1$I = AccountBalance.default = void 0;
var _createSvgIcon$I = _interopRequireDefault$I(requireCreateSvgIcon());
var _jsxRuntime$I = jsxRuntimeExports;
default_1$I = AccountBalance.default = (0, _createSvgIcon$I.default)(/* @__PURE__ */ (0, _jsxRuntime$I.jsx)("path", {
  d: "M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z"
}), "AccountBalance");
var Assessment = {};
var _interopRequireDefault$H = interopRequireDefaultExports;
Object.defineProperty(Assessment, "__esModule", {
  value: true
});
var default_1$H = Assessment.default = void 0;
var _createSvgIcon$H = _interopRequireDefault$H(requireCreateSvgIcon());
var _jsxRuntime$H = jsxRuntimeExports;
default_1$H = Assessment.default = (0, _createSvgIcon$H.default)(/* @__PURE__ */ (0, _jsxRuntime$H.jsx)("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M9 17H7v-7h2zm4 0h-2V7h2zm4 0h-2v-4h2z"
}), "Assessment");
var Settings = {};
var _interopRequireDefault$G = interopRequireDefaultExports;
Object.defineProperty(Settings, "__esModule", {
  value: true
});
var default_1$G = Settings.default = void 0;
var _createSvgIcon$G = _interopRequireDefault$G(requireCreateSvgIcon());
var _jsxRuntime$G = jsxRuntimeExports;
default_1$G = Settings.default = (0, _createSvgIcon$G.default)(/* @__PURE__ */ (0, _jsxRuntime$G.jsx)("path", {
  d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6"
}), "Settings");
var Edit = {};
var _interopRequireDefault$F = interopRequireDefaultExports;
Object.defineProperty(Edit, "__esModule", {
  value: true
});
var default_1$F = Edit.default = void 0;
var _createSvgIcon$F = _interopRequireDefault$F(requireCreateSvgIcon());
var _jsxRuntime$F = jsxRuntimeExports;
default_1$F = Edit.default = (0, _createSvgIcon$F.default)(/* @__PURE__ */ (0, _jsxRuntime$F.jsx)("path", {
  d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"
}), "Edit");
var Add = {};
var _interopRequireDefault$E = interopRequireDefaultExports;
Object.defineProperty(Add, "__esModule", {
  value: true
});
var default_1$E = Add.default = void 0;
var _createSvgIcon$E = _interopRequireDefault$E(requireCreateSvgIcon());
var _jsxRuntime$E = jsxRuntimeExports;
default_1$E = Add.default = (0, _createSvgIcon$E.default)(/* @__PURE__ */ (0, _jsxRuntime$E.jsx)("path", {
  d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"
}), "Add");
var ArrowBack = {};
var _interopRequireDefault$D = interopRequireDefaultExports;
Object.defineProperty(ArrowBack, "__esModule", {
  value: true
});
var default_1$D = ArrowBack.default = void 0;
var _createSvgIcon$D = _interopRequireDefault$D(requireCreateSvgIcon());
var _jsxRuntime$D = jsxRuntimeExports;
default_1$D = ArrowBack.default = (0, _createSvgIcon$D.default)(/* @__PURE__ */ (0, _jsxRuntime$D.jsx)("path", {
  d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"
}), "ArrowBack");
var CheckCircle = {};
var _interopRequireDefault$C = interopRequireDefaultExports;
Object.defineProperty(CheckCircle, "__esModule", {
  value: true
});
var default_1$C = CheckCircle.default = void 0;
var _createSvgIcon$C = _interopRequireDefault$C(requireCreateSvgIcon());
var _jsxRuntime$C = jsxRuntimeExports;
default_1$C = CheckCircle.default = (0, _createSvgIcon$C.default)(/* @__PURE__ */ (0, _jsxRuntime$C.jsx)("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"
}), "CheckCircle");
var RadioButtonUnchecked = {};
var _interopRequireDefault$B = interopRequireDefaultExports;
Object.defineProperty(RadioButtonUnchecked, "__esModule", {
  value: true
});
var default_1$B = RadioButtonUnchecked.default = void 0;
var _createSvgIcon$B = _interopRequireDefault$B(requireCreateSvgIcon());
var _jsxRuntime$B = jsxRuntimeExports;
default_1$B = RadioButtonUnchecked.default = (0, _createSvgIcon$B.default)(/* @__PURE__ */ (0, _jsxRuntime$B.jsx)("path", {
  d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), "RadioButtonUnchecked");
var AccessTime = {};
var _interopRequireDefault$A = interopRequireDefaultExports;
Object.defineProperty(AccessTime, "__esModule", {
  value: true
});
var default_1$A = AccessTime.default = void 0;
var _createSvgIcon$A = _interopRequireDefault$A(requireCreateSvgIcon());
var _jsxRuntime$A = jsxRuntimeExports;
default_1$A = AccessTime.default = (0, _createSvgIcon$A.default)([/* @__PURE__ */ (0, _jsxRuntime$A.jsx)("path", {
  d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}, "0"), /* @__PURE__ */ (0, _jsxRuntime$A.jsx)("path", {
  d: "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
}, "1")], "AccessTime");
var Delete = {};
var _interopRequireDefault$z = interopRequireDefaultExports;
Object.defineProperty(Delete, "__esModule", {
  value: true
});
var default_1$z = Delete.default = void 0;
var _createSvgIcon$z = _interopRequireDefault$z(requireCreateSvgIcon());
var _jsxRuntime$z = jsxRuntimeExports;
default_1$z = Delete.default = (0, _createSvgIcon$z.default)(/* @__PURE__ */ (0, _jsxRuntime$z.jsx)("path", {
  d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"
}), "Delete");
var Share = {};
var _interopRequireDefault$y = interopRequireDefaultExports;
Object.defineProperty(Share, "__esModule", {
  value: true
});
var default_1$y = Share.default = void 0;
var _createSvgIcon$y = _interopRequireDefault$y(requireCreateSvgIcon());
var _jsxRuntime$y = jsxRuntimeExports;
default_1$y = Share.default = (0, _createSvgIcon$y.default)(/* @__PURE__ */ (0, _jsxRuntime$y.jsx)("path", {
  d: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92"
}), "Share");
var Output = {};
var _interopRequireDefault$x = interopRequireDefaultExports;
Object.defineProperty(Output, "__esModule", {
  value: true
});
var default_1$x = Output.default = void 0;
var _createSvgIcon$x = _interopRequireDefault$x(requireCreateSvgIcon());
var _jsxRuntime$x = jsxRuntimeExports;
default_1$x = Output.default = (0, _createSvgIcon$x.default)([/* @__PURE__ */ (0, _jsxRuntime$x.jsx)("path", {
  d: "m17 17 5-5-5-5-1.41 1.41L18.17 11H9v2h9.17l-2.58 2.59z"
}, "0"), /* @__PURE__ */ (0, _jsxRuntime$x.jsx)("path", {
  d: "M19 19H5V5h14v2h2V5c0-1.1-.89-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.11 0 2-.9 2-2v-2h-2z"
}, "1")], "Output");
var Inventory = {};
var _interopRequireDefault$w = interopRequireDefaultExports;
Object.defineProperty(Inventory, "__esModule", {
  value: true
});
var default_1$w = Inventory.default = void 0;
var _createSvgIcon$w = _interopRequireDefault$w(requireCreateSvgIcon());
var _jsxRuntime$w = jsxRuntimeExports;
default_1$w = Inventory.default = (0, _createSvgIcon$w.default)(/* @__PURE__ */ (0, _jsxRuntime$w.jsx)("path", {
  d: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-5 12H9v-2h6zm5-7H4V4l16-.02z"
}), "Inventory");
var Factory = {};
var _interopRequireDefault$v = interopRequireDefaultExports;
Object.defineProperty(Factory, "__esModule", {
  value: true
});
var default_1$v = Factory.default = void 0;
var _createSvgIcon$v = _interopRequireDefault$v(requireCreateSvgIcon());
var _jsxRuntime$v = jsxRuntimeExports;
default_1$v = Factory.default = (0, _createSvgIcon$v.default)(/* @__PURE__ */ (0, _jsxRuntime$v.jsx)("path", {
  d: "M22 10v12H2V10l7-3v2l5-2v3zm-4.8-1.5L18 2h3l.8 6.5zM11 18h2v-4h-2zm-4 0h2v-4H7zm10-4h-2v4h2z"
}), "Factory");
var Refresh = {};
var _interopRequireDefault$u = interopRequireDefaultExports;
Object.defineProperty(Refresh, "__esModule", {
  value: true
});
var default_1$u = Refresh.default = void 0;
var _createSvgIcon$u = _interopRequireDefault$u(requireCreateSvgIcon());
var _jsxRuntime$u = jsxRuntimeExports;
default_1$u = Refresh.default = (0, _createSvgIcon$u.default)(/* @__PURE__ */ (0, _jsxRuntime$u.jsx)("path", {
  d: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"
}), "Refresh");
var WarningAmber = {};
var _interopRequireDefault$t = interopRequireDefaultExports;
Object.defineProperty(WarningAmber, "__esModule", {
  value: true
});
var default_1$t = WarningAmber.default = void 0;
var _createSvgIcon$t = _interopRequireDefault$t(requireCreateSvgIcon());
var _jsxRuntime$t = jsxRuntimeExports;
default_1$t = WarningAmber.default = (0, _createSvgIcon$t.default)([/* @__PURE__ */ (0, _jsxRuntime$t.jsx)("path", {
  d: "M12 5.99 19.53 19H4.47zM12 2 1 21h22z"
}, "0"), /* @__PURE__ */ (0, _jsxRuntime$t.jsx)("path", {
  d: "M13 16h-2v2h2zm0-6h-2v5h2z"
}, "1")], "WarningAmber");
var AddShoppingCart = {};
var _interopRequireDefault$s = interopRequireDefaultExports;
Object.defineProperty(AddShoppingCart, "__esModule", {
  value: true
});
var default_1$s = AddShoppingCart.default = void 0;
var _createSvgIcon$s = _interopRequireDefault$s(requireCreateSvgIcon());
var _jsxRuntime$s = jsxRuntimeExports;
default_1$s = AddShoppingCart.default = (0, _createSvgIcon$s.default)(/* @__PURE__ */ (0, _jsxRuntime$s.jsx)("path", {
  d: "M11 9h2V6h3V4h-3V1h-2v3H8v2h3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2m10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2m-9.83-3.25.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25"
}), "AddShoppingCart");
var Engineering = {};
var _interopRequireDefault$r = interopRequireDefaultExports;
Object.defineProperty(Engineering, "__esModule", {
  value: true
});
var default_1$r = Engineering.default = void 0;
var _createSvgIcon$r = _interopRequireDefault$r(requireCreateSvgIcon());
var _jsxRuntime$r = jsxRuntimeExports;
default_1$r = Engineering.default = (0, _createSvgIcon$r.default)(/* @__PURE__ */ (0, _jsxRuntime$r.jsx)("path", {
  d: "M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4m13.1-8.16c.01-.11.02-.22.02-.34 0-.12-.01-.23-.03-.34l.74-.58c.07-.05.08-.15.04-.22l-.7-1.21c-.04-.08-.14-.1-.21-.08l-.86.35c-.18-.14-.38-.25-.59-.34l-.13-.93c-.02-.09-.09-.15-.18-.15h-1.4c-.09 0-.16.06-.17.15l-.13.93c-.21.09-.41.21-.59.34l-.87-.35c-.08-.03-.17 0-.21.08l-.7 1.21c-.04.08-.03.17.04.22l.74.58c-.02.11-.03.23-.03.34 0 .11.01.23.03.34l-.74.58c-.07.05-.08.15-.04.22l.7 1.21c.04.08.14.1.21.08l.87-.35c.18.14.38.25.59.34l.13.93c.01.09.08.15.17.15h1.4c.09 0 .16-.06.17-.15l.13-.93c.21-.09.41-.21.59-.34l.87.35c.08.03.17 0 .21-.08l.7-1.21c.04-.08.03-.17-.04-.22zm-2.6.91c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25m.42 3.93-.5-.87c-.03-.06-.1-.08-.15-.06l-.62.25c-.13-.1-.27-.18-.42-.24l-.09-.66c-.02-.06-.08-.1-.14-.1h-1c-.06 0-.11.04-.12.11l-.09.66c-.15.06-.29.15-.42.24l-.62-.25c-.06-.02-.12 0-.15.06l-.5.87c-.03.06-.02.12.03.16l.53.41c-.01.08-.02.16-.02.24 0 .08.01.17.02.24l-.53.41c-.05.04-.06.11-.03.16l.5.87c.03.06.1.08.15.06l.62-.25c.13.1.27.18.42.24l.09.66c.01.07.06.11.12.11h1c.06 0 .12-.04.12-.11l.09-.66c.15-.06.29-.15.42-.24l.62.25c.06.02.12 0 .15-.06l.5-.87c.03-.06.02-.12-.03-.16l-.52-.41c.01-.08.02-.16.02-.24 0-.08-.01-.17-.02-.24l.53-.41c.05-.04.06-.11.04-.17m-2.42 1.65c-.46 0-.83-.38-.83-.83 0-.46.38-.83.83-.83s.83.38.83.83c0 .46-.37.83-.83.83M4.74 9h8.53c.27 0 .49-.22.49-.49v-.02c0-.27-.22-.49-.49-.49H13c0-1.48-.81-2.75-2-3.45v.95c0 .28-.22.5-.5.5s-.5-.22-.5-.5V4.14C9.68 4.06 9.35 4 9 4s-.68.06-1 .14V5.5c0 .28-.22.5-.5.5S7 5.78 7 5.5v-.95C5.81 5.25 5 6.52 5 8h-.26c-.27 0-.49.22-.49.49v.03c0 .26.22.48.49.48M9 13c1.86 0 3.41-1.28 3.86-3H5.14c.45 1.72 2 3 3.86 3"
}), "Engineering");
var TrendingUp = {};
var _interopRequireDefault$q = interopRequireDefaultExports;
Object.defineProperty(TrendingUp, "__esModule", {
  value: true
});
var default_1$q = TrendingUp.default = void 0;
var _createSvgIcon$q = _interopRequireDefault$q(requireCreateSvgIcon());
var _jsxRuntime$q = jsxRuntimeExports;
default_1$q = TrendingUp.default = (0, _createSvgIcon$q.default)(/* @__PURE__ */ (0, _jsxRuntime$q.jsx)("path", {
  d: "m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"
}), "TrendingUp");
var Build = {};
var _interopRequireDefault$p = interopRequireDefaultExports;
Object.defineProperty(Build, "__esModule", {
  value: true
});
var default_1$p = Build.default = void 0;
var _createSvgIcon$p = _interopRequireDefault$p(requireCreateSvgIcon());
var _jsxRuntime$p = jsxRuntimeExports;
default_1$p = Build.default = (0, _createSvgIcon$p.default)(/* @__PURE__ */ (0, _jsxRuntime$p.jsx)("path", {
  d: "m22.7 19-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4"
}), "Build");
var CheckCircleOutline = {};
var _interopRequireDefault$o = interopRequireDefaultExports;
Object.defineProperty(CheckCircleOutline, "__esModule", {
  value: true
});
var default_1$o = CheckCircleOutline.default = void 0;
var _createSvgIcon$o = _interopRequireDefault$o(requireCreateSvgIcon());
var _jsxRuntime$o = jsxRuntimeExports;
default_1$o = CheckCircleOutline.default = (0, _createSvgIcon$o.default)(/* @__PURE__ */ (0, _jsxRuntime$o.jsx)("path", {
  d: "M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), "CheckCircleOutline");
var Schedule = {};
var _interopRequireDefault$n = interopRequireDefaultExports;
Object.defineProperty(Schedule, "__esModule", {
  value: true
});
var default_1$n = Schedule.default = void 0;
var _createSvgIcon$n = _interopRequireDefault$n(requireCreateSvgIcon());
var _jsxRuntime$n = jsxRuntimeExports;
default_1$n = Schedule.default = (0, _createSvgIcon$n.default)([/* @__PURE__ */ (0, _jsxRuntime$n.jsx)("path", {
  d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}, "0"), /* @__PURE__ */ (0, _jsxRuntime$n.jsx)("path", {
  d: "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
}, "1")], "Schedule");
var PlaylistAddCheck = {};
var _interopRequireDefault$m = interopRequireDefaultExports;
Object.defineProperty(PlaylistAddCheck, "__esModule", {
  value: true
});
var default_1$m = PlaylistAddCheck.default = void 0;
var _createSvgIcon$m = _interopRequireDefault$m(requireCreateSvgIcon());
var _jsxRuntime$m = jsxRuntimeExports;
default_1$m = PlaylistAddCheck.default = (0, _createSvgIcon$m.default)(/* @__PURE__ */ (0, _jsxRuntime$m.jsx)("path", {
  d: "M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm17.59-2.07-4.25 4.24-2.12-2.12-1.41 1.41L16.34 19 22 13.34z"
}), "PlaylistAddCheck");
var History = {};
var _interopRequireDefault$l = interopRequireDefaultExports;
Object.defineProperty(History, "__esModule", {
  value: true
});
var default_1$l = History.default = void 0;
var _createSvgIcon$l = _interopRequireDefault$l(requireCreateSvgIcon());
var _jsxRuntime$l = jsxRuntimeExports;
default_1$l = History.default = (0, _createSvgIcon$l.default)(/* @__PURE__ */ (0, _jsxRuntime$l.jsx)("path", {
  d: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9m-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z"
}), "History");
var DeleteOutline = {};
var _interopRequireDefault$k = interopRequireDefaultExports;
Object.defineProperty(DeleteOutline, "__esModule", {
  value: true
});
var default_1$k = DeleteOutline.default = void 0;
var _createSvgIcon$k = _interopRequireDefault$k(requireCreateSvgIcon());
var _jsxRuntime$k = jsxRuntimeExports;
default_1$k = DeleteOutline.default = (0, _createSvgIcon$k.default)(/* @__PURE__ */ (0, _jsxRuntime$k.jsx)("path", {
  d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM8 9h8v10H8zm7.5-5-1-1h-5l-1 1H5v2h14V4z"
}), "DeleteOutline");
var Hub = {};
var _interopRequireDefault$j = interopRequireDefaultExports;
Object.defineProperty(Hub, "__esModule", {
  value: true
});
var default_1$j = Hub.default = void 0;
var _createSvgIcon$j = _interopRequireDefault$j(requireCreateSvgIcon());
var _jsxRuntime$j = jsxRuntimeExports;
default_1$j = Hub.default = (0, _createSvgIcon$j.default)(/* @__PURE__ */ (0, _jsxRuntime$j.jsx)("path", {
  d: "M8.4 18.2c.38.5.6 1.12.6 1.8 0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3c.44 0 .85.09 1.23.26l1.41-1.77c-.92-1.03-1.29-2.39-1.09-3.69l-2.03-.68c-.54.83-1.46 1.38-2.52 1.38-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3c0 .07 0 .14-.01.21l2.03.68c.64-1.21 1.82-2.09 3.22-2.32V5.91C9.96 5.57 9 4.4 9 3c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.4-.96 2.57-2.25 2.91v2.16c1.4.23 2.58 1.11 3.22 2.32L18 9.71V9.5c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3c-1.06 0-1.98-.55-2.52-1.37l-2.03.68c.2 1.29-.16 2.65-1.09 3.69l1.41 1.77c.38-.18.79-.27 1.23-.27 1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3c0-.68.22-1.3.6-1.8l-1.41-1.77c-1.35.75-3.01.76-4.37 0z"
}), "Hub");
var AttachMoney = {};
var _interopRequireDefault$i = interopRequireDefaultExports;
Object.defineProperty(AttachMoney, "__esModule", {
  value: true
});
var default_1$i = AttachMoney.default = void 0;
var _createSvgIcon$i = _interopRequireDefault$i(requireCreateSvgIcon());
var _jsxRuntime$i = jsxRuntimeExports;
default_1$i = AttachMoney.default = (0, _createSvgIcon$i.default)(/* @__PURE__ */ (0, _jsxRuntime$i.jsx)("path", {
  d: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4"
}), "AttachMoney");
var Save = {};
var _interopRequireDefault$h = interopRequireDefaultExports;
Object.defineProperty(Save, "__esModule", {
  value: true
});
var default_1$h = Save.default = void 0;
var _createSvgIcon$h = _interopRequireDefault$h(requireCreateSvgIcon());
var _jsxRuntime$h = jsxRuntimeExports;
default_1$h = Save.default = (0, _createSvgIcon$h.default)(/* @__PURE__ */ (0, _jsxRuntime$h.jsx)("path", {
  d: "M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3m3-10H5V5h10z"
}), "Save");
var Lock = {};
var _interopRequireDefault$g = interopRequireDefaultExports;
Object.defineProperty(Lock, "__esModule", {
  value: true
});
var default_1$g = Lock.default = void 0;
var _createSvgIcon$g = _interopRequireDefault$g(requireCreateSvgIcon());
var _jsxRuntime$g = jsxRuntimeExports;
default_1$g = Lock.default = (0, _createSvgIcon$g.default)(/* @__PURE__ */ (0, _jsxRuntime$g.jsx)("path", {
  d: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2m3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1z"
}), "Lock");
var LockOpen = {};
var _interopRequireDefault$f = interopRequireDefaultExports;
Object.defineProperty(LockOpen, "__esModule", {
  value: true
});
var default_1$f = LockOpen.default = void 0;
var _createSvgIcon$f = _interopRequireDefault$f(requireCreateSvgIcon());
var _jsxRuntime$f = jsxRuntimeExports;
default_1$f = LockOpen.default = (0, _createSvgIcon$f.default)(/* @__PURE__ */ (0, _jsxRuntime$f.jsx)("path", {
  d: "M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m0 12H6V10h12z"
}), "LockOpen");
var ViewTimeline = {};
var _interopRequireDefault$e = interopRequireDefaultExports;
Object.defineProperty(ViewTimeline, "__esModule", {
  value: true
});
var default_1$e = ViewTimeline.default = void 0;
var _createSvgIcon$e = _interopRequireDefault$e(requireCreateSvgIcon());
var _jsxRuntime$e = jsxRuntimeExports;
default_1$e = ViewTimeline.default = (0, _createSvgIcon$e.default)(/* @__PURE__ */ (0, _jsxRuntime$e.jsx)("path", {
  d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H6v-2h6zm3-4H9v-2h6zm3-4h-6V7h6z"
}), "ViewTimeline");
var ChevronLeft = {};
var _interopRequireDefault$d = interopRequireDefaultExports;
Object.defineProperty(ChevronLeft, "__esModule", {
  value: true
});
var default_1$d = ChevronLeft.default = void 0;
var _createSvgIcon$d = _interopRequireDefault$d(requireCreateSvgIcon());
var _jsxRuntime$d = jsxRuntimeExports;
default_1$d = ChevronLeft.default = (0, _createSvgIcon$d.default)(/* @__PURE__ */ (0, _jsxRuntime$d.jsx)("path", {
  d: "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
}), "ChevronLeft");
var ChevronRight = {};
var _interopRequireDefault$c = interopRequireDefaultExports;
Object.defineProperty(ChevronRight, "__esModule", {
  value: true
});
var default_1$c = ChevronRight.default = void 0;
var _createSvgIcon$c = _interopRequireDefault$c(requireCreateSvgIcon());
var _jsxRuntime$c = jsxRuntimeExports;
default_1$c = ChevronRight.default = (0, _createSvgIcon$c.default)(/* @__PURE__ */ (0, _jsxRuntime$c.jsx)("path", {
  d: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
}), "ChevronRight");
var RestartAlt = {};
var _interopRequireDefault$b = interopRequireDefaultExports;
Object.defineProperty(RestartAlt, "__esModule", {
  value: true
});
var default_1$b = RestartAlt.default = void 0;
var _createSvgIcon$b = _interopRequireDefault$b(requireCreateSvgIcon());
var _jsxRuntime$b = jsxRuntimeExports;
default_1$b = RestartAlt.default = (0, _createSvgIcon$b.default)(/* @__PURE__ */ (0, _jsxRuntime$b.jsx)("path", {
  d: "M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8m-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91"
}), "RestartAlt");
var AutoFixHigh = {};
var _interopRequireDefault$a = interopRequireDefaultExports;
Object.defineProperty(AutoFixHigh, "__esModule", {
  value: true
});
var default_1$a = AutoFixHigh.default = void 0;
var _createSvgIcon$a = _interopRequireDefault$a(requireCreateSvgIcon());
var _jsxRuntime$a = jsxRuntimeExports;
default_1$a = AutoFixHigh.default = (0, _createSvgIcon$a.default)(/* @__PURE__ */ (0, _jsxRuntime$a.jsx)("path", {
  d: "M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.9959.9959 0 0 0-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12z"
}), "AutoFixHigh");
var Check = {};
var _interopRequireDefault$9 = interopRequireDefaultExports;
Object.defineProperty(Check, "__esModule", {
  value: true
});
var default_1$9 = Check.default = void 0;
var _createSvgIcon$9 = _interopRequireDefault$9(requireCreateSvgIcon());
var _jsxRuntime$9 = jsxRuntimeExports;
default_1$9 = Check.default = (0, _createSvgIcon$9.default)(/* @__PURE__ */ (0, _jsxRuntime$9.jsx)("path", {
  d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
}), "Check");
var Receipt = {};
var _interopRequireDefault$8 = interopRequireDefaultExports;
Object.defineProperty(Receipt, "__esModule", {
  value: true
});
var default_1$8 = Receipt.default = void 0;
var _createSvgIcon$8 = _interopRequireDefault$8(requireCreateSvgIcon());
var _jsxRuntime$8 = jsxRuntimeExports;
default_1$8 = Receipt.default = (0, _createSvgIcon$8.default)(/* @__PURE__ */ (0, _jsxRuntime$8.jsx)("path", {
  d: "M18 17H6v-2h12zm0-4H6v-2h12zm0-4H6V7h12zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2z"
}), "Receipt");
var Payment = {};
var _interopRequireDefault$7 = interopRequireDefaultExports;
Object.defineProperty(Payment, "__esModule", {
  value: true
});
var default_1$7 = Payment.default = void 0;
var _createSvgIcon$7 = _interopRequireDefault$7(requireCreateSvgIcon());
var _jsxRuntime$7 = jsxRuntimeExports;
default_1$7 = Payment.default = (0, _createSvgIcon$7.default)(/* @__PURE__ */ (0, _jsxRuntime$7.jsx)("path", {
  d: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2m0 14H4v-6h16zm0-10H4V6h16z"
}), "Payment");
var AccessAlarm = {};
var _interopRequireDefault$6 = interopRequireDefaultExports;
Object.defineProperty(AccessAlarm, "__esModule", {
  value: true
});
var default_1$6 = AccessAlarm.default = void 0;
var _createSvgIcon$6 = _interopRequireDefault$6(requireCreateSvgIcon());
var _jsxRuntime$6 = jsxRuntimeExports;
default_1$6 = AccessAlarm.default = (0, _createSvgIcon$6.default)(/* @__PURE__ */ (0, _jsxRuntime$6.jsx)("path", {
  d: "m22 5.72-4.6-3.86-1.29 1.53 4.6 3.86zM7.88 3.39 6.6 1.86 2 5.71l1.29 1.53zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9m0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7"
}), "AccessAlarm");
var Balance = {};
var _interopRequireDefault$5 = interopRequireDefaultExports;
Object.defineProperty(Balance, "__esModule", {
  value: true
});
var default_1$5 = Balance.default = void 0;
var _createSvgIcon$5 = _interopRequireDefault$5(requireCreateSvgIcon());
var _jsxRuntime$5 = jsxRuntimeExports;
default_1$5 = Balance.default = (0, _createSvgIcon$5.default)(/* @__PURE__ */ (0, _jsxRuntime$5.jsx)("path", {
  d: "M13 7.83c.85-.3 1.53-.98 1.83-1.83H18l-3 7c0 1.66 1.57 3 3.5 3s3.5-1.34 3.5-3l-3-7h2V4h-6.17c-.41-1.17-1.52-2-2.83-2s-2.42.83-2.83 2H3v2h2l-3 7c0 1.66 1.57 3 3.5 3S9 14.66 9 13L6 6h3.17c.3.85.98 1.53 1.83 1.83V19H2v2h20v-2h-9zM20.37 13h-3.74l1.87-4.36zm-13 0H3.63L5.5 8.64zM12 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"
}), "Balance");
var Timeline = {};
var _interopRequireDefault$4 = interopRequireDefaultExports;
Object.defineProperty(Timeline, "__esModule", {
  value: true
});
var default_1$4 = Timeline.default = void 0;
var _createSvgIcon$4 = _interopRequireDefault$4(requireCreateSvgIcon());
var _jsxRuntime$4 = jsxRuntimeExports;
default_1$4 = Timeline.default = (0, _createSvgIcon$4.default)(/* @__PURE__ */ (0, _jsxRuntime$4.jsx)("path", {
  d: "M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2"
}), "Timeline");
var AccountTree = {};
var _interopRequireDefault$3 = interopRequireDefaultExports;
Object.defineProperty(AccountTree, "__esModule", {
  value: true
});
var default_1$3 = AccountTree.default = void 0;
var _createSvgIcon$3 = _interopRequireDefault$3(requireCreateSvgIcon());
var _jsxRuntime$3 = jsxRuntimeExports;
default_1$3 = AccountTree.default = (0, _createSvgIcon$3.default)(/* @__PURE__ */ (0, _jsxRuntime$3.jsx)("path", {
  d: "M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z"
}), "AccountTree");
var AccountBalanceWallet = {};
var _interopRequireDefault$2 = interopRequireDefaultExports;
Object.defineProperty(AccountBalanceWallet, "__esModule", {
  value: true
});
var default_1$2 = AccountBalanceWallet.default = void 0;
var _createSvgIcon$2 = _interopRequireDefault$2(requireCreateSvgIcon());
var _jsxRuntime$2 = jsxRuntimeExports;
default_1$2 = AccountBalanceWallet.default = (0, _createSvgIcon$2.default)(/* @__PURE__ */ (0, _jsxRuntime$2.jsx)("path", {
  d: "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2zm-9-2h10V8H12zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5"
}), "AccountBalanceWallet");
var Flag = {};
var _interopRequireDefault$1 = interopRequireDefaultExports;
Object.defineProperty(Flag, "__esModule", {
  value: true
});
var default_1$1 = Flag.default = void 0;
var _createSvgIcon$1 = _interopRequireDefault$1(requireCreateSvgIcon());
var _jsxRuntime$1 = jsxRuntimeExports;
default_1$1 = Flag.default = (0, _createSvgIcon$1.default)(/* @__PURE__ */ (0, _jsxRuntime$1.jsx)("path", {
  d: "M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z"
}), "Flag");
var SwapHoriz = {};
var _interopRequireDefault = interopRequireDefaultExports;
Object.defineProperty(SwapHoriz, "__esModule", {
  value: true
});
var default_1 = SwapHoriz.default = void 0;
var _createSvgIcon = _interopRequireDefault(requireCreateSvgIcon());
var _jsxRuntime = jsxRuntimeExports;
default_1 = SwapHoriz.default = (0, _createSvgIcon.default)(/* @__PURE__ */ (0, _jsxRuntime.jsx)("path", {
  d: "M6.99 11 3 15l3.99 4v-3H14v-2H6.99zM21 9l-3.99-4v3H10v2h7.01v3z"
}), "SwapHoriz");
export {
  CompareArrows as $,
  Approval as A,
  Box$1 as B,
  CssBaseline as C,
  Drawer as D,
  ExpandLess as E,
  FactCheck$1 as F,
  Category as G,
  ListAlt as H,
  Layers as I,
  Inventory2$1 as J,
  Block as K,
  List as L,
  Assessment$1 as M,
  NoSsr as N,
  WarningAmber$1 as O,
  Popper as P,
  OpenInNew as Q,
  People as R,
  Star as S,
  Typography as T,
  RequestQuote as U,
  Assignment as V,
  Workspaces as W,
  LocalShipping as X,
  Description as Y,
  SwapHoriz$1 as Z,
  CartIcon as _,
  useSlotProps$1 as a,
  DoneAll as a$,
  AttachMoney$1 as a0,
  MonetizationOn$1 as a1,
  VerifiedUser as a2,
  MoveToInbox as a3,
  QrCode2 as a4,
  CallReceived as a5,
  PlaylistAddCheck$1 as a6,
  Inventory$1 as a7,
  Schedule$1 as a8,
  Warehouse$1 as a9,
  CreditCard as aA,
  MenuBook$1 as aB,
  Summarize as aC,
  TrackChanges as aD,
  Savings as aE,
  AccountBalanceWallet$1 as aF,
  Lock$1 as aG,
  AccountBalance$1 as aH,
  Chat as aI,
  Settings$1 as aJ,
  AppBar as aK,
  Toolbar as aL,
  IconButton as aM,
  MenuIcon as aN,
  Chip as aO,
  FormControl as aP,
  Select as aQ,
  MenuItem as aR,
  Paper as aS,
  Search$1 as aT,
  InputBase as aU,
  CloseIcon as aV,
  Breadcrumbs as aW,
  Link as aX,
  NavigateNext as aY,
  Notifications as aZ,
  Popover as a_,
  Rule as aa,
  AccountTree$1 as ab,
  Storefront$1 as ac,
  PersonSearch as ad,
  Person as ae,
  Article as af,
  ReceiptIcon as ag,
  QueryStats as ah,
  FilterAlt as ai,
  Analytics as aj,
  ChecklistRtl as ak,
  ReportProblem as al,
  AutorenewIcon as am,
  Insights as an,
  Science as ao,
  BarChart as ap,
  EventNote as aq,
  Route as ar,
  Hub$1 as as,
  ChangeCircle as at,
  Outbound as au,
  Speed as av,
  Build$1 as aw,
  TimelineIcon as ax,
  ViewTimeline$1 as ay,
  PrecisionManufacturing$1 as az,
  generateUtilityClasses as b,
  ArrowForward as b$,
  ErrorOutline as b0,
  WarningAmberOutlined as b1,
  InfoOutlined$1 as b2,
  HelpOutline as b3,
  Avatar as b4,
  Menu as b5,
  Logout as b6,
  CheckCircleOutline$1 as b7,
  CloseFullscreen as b8,
  Dialog as b9,
  AccordionDetails as bA,
  Stepper as bB,
  Step as bC,
  StepLabel as bD,
  DialogActions as bE,
  KeyboardArrowLeft as bF,
  KeyboardArrowRight as bG,
  MobileStepper as bH,
  Checkroom as bI,
  NoteAdd as bJ,
  Business as bK,
  Stack as bL,
  MenuOpen as bM,
  Handshake as bN,
  Warning as bO,
  Payment$1 as bP,
  InputAdornment as bQ,
  VisibilityOff as bR,
  Visibility$1 as bS,
  Login as bT,
  Language as bU,
  Support as bV,
  CheckCircle$1 as bW,
  HowToReg as bX,
  Grid as bY,
  ArrowBack$1 as bZ,
  AttachFile$1 as b_,
  DialogTitle as ba,
  Keyboard as bb,
  DialogContent as bc,
  Save$1 as bd,
  Delete$1 as be,
  Print$1 as bf,
  Refresh$1 as bg,
  Add$1 as bh,
  Edit$1 as bi,
  Undo as bj,
  Redo as bk,
  Alert as bl,
  Button as bm,
  CircularProgress as bn,
  Fab as bo,
  SmartToy as bp,
  History$1 as bq,
  DeleteOutline$1 as br,
  Card as bs,
  CardContent as bt,
  CardActions as bu,
  TextField as bv,
  Send as bw,
  Zoom as bx,
  Accordion as by,
  AccordionSummary as bz,
  composeClasses as c,
  Image$1 as c$,
  ContactPage as c0,
  InputLabel as c1,
  Tabs as c2,
  Tab as c3,
  AccountCircle as c4,
  Badge as c5,
  LocalizationProvider as c6,
  AdapterDayjs as c7,
  TrendingUp$1 as c8,
  TrendingDown as c9,
  default_1$P as cA,
  default_1$Q as cB,
  Autocomplete as cC,
  TableContainer as cD,
  Table as cE,
  TableHead as cF,
  TableRow as cG,
  TableCell as cH,
  TableBody as cI,
  Snackbar as cJ,
  Share$1 as cK,
  default_1$F as cL,
  FormControlLabel as cM,
  Switch as cN,
  ThumbUp as cO,
  Clear as cP,
  StepContent as cQ,
  Rating as cR,
  CalendarToday as cS,
  Cancel as cT,
  Slider as cU,
  QrCode as cV,
  LocationOn as cW,
  Checkbox as cX,
  PictureAsPdf as cY,
  AccessAlarm$1 as cZ,
  FilterList as c_,
  RateReview as ca,
  Outbox as cb,
  PointOfSale as cc,
  Engineering$1 as cd,
  TaskAlt as ce,
  GroupAdd as cf,
  RefreshOutlined as cg,
  LinearProgress as ch,
  ArrowForwardIos as ci,
  FiberManualRecord as cj,
  RestartAlt$1 as ck,
  DragIndicator as cl,
  ReceiptLong as cm,
  RadioButtonUnchecked$1 as cn,
  AutoFixHigh$1 as co,
  default_1$R as cp,
  default_1$S as cq,
  default_1$G as cr,
  default_1$H as cs,
  default_1$I as ct,
  default_1$J as cu,
  default_1$K as cv,
  default_1$L as cw,
  default_1$M as cx,
  default_1$N as cy,
  default_1$O as cz,
  useForkRef as d,
  Tune as d$,
  Download as d0,
  Info as d1,
  Security as d2,
  PersonAdd as d3,
  SupportAgent as d4,
  AdminPanelSettings as d5,
  FileDownloadOutlined as d6,
  EditNote as d7,
  ContentPaste as d8,
  TableFooter as d9,
  ArrowDownward as dA,
  AccessTime$1 as dB,
  FormLabel as dC,
  RadioGroup as dD,
  Radio as dE,
  AweIcon as dF,
  default_1$E as dG,
  PlayArrow as dH,
  PlaylistAdd as dI,
  Check$1 as dJ,
  SortByAlpha as dK,
  Store as dL,
  Factory$1 as dM,
  CallSplit as dN,
  KeyboardArrowUp as dO,
  KeyboardArrowDown as dP,
  Stop as dQ,
  ToggleButtonGroup as dR,
  ToggleButton as dS,
  Sync as dT,
  LinkOff as dU,
  CloudQueue as dV,
  PhoneAndroid as dW,
  CameraAlt as dX,
  Bolt as dY,
  Replay as dZ,
  ViewList as d_,
  LinkOutlined as da,
  ChevronRight$1 as db,
  SubdirectoryArrowRight as dc,
  Upload as dd,
  ViewColumn as de,
  ContentCopy as df,
  TableSortLabel as dg,
  TablePagination as dh,
  MoreVert as di,
  DialogContentText as dj,
  Help as dk,
  Error$1 as dl,
  Bookmark as dm,
  CloudUpload as dn,
  InsertDriveFile as dp,
  Timeline$1 as dq,
  TimelineItem as dr,
  TimelineOppositeContent as ds,
  TimelineSeparator as dt,
  TimelineConnector as du,
  TimelineDot as dv,
  TimelineContent as dw,
  default_1$U as dx,
  default_1$T as dy,
  ArrowUpward as dz,
  useEnhancedEffect as e,
  default_1$8 as e$,
  LightMode as e0,
  DarkMode as e1,
  Casino as e2,
  ButtonGroup as e3,
  OutlinedInput as e4,
  Calculate as e5,
  Storage as e6,
  DeleteSweep as e7,
  AlertTitle as e8,
  Key as e9,
  default_1$z as eA,
  default_1$y as eB,
  default_1$B as eC,
  default_1$A as eD,
  default_1$C as eE,
  default_1$u as eF,
  default_1$v as eG,
  default_1$t as eH,
  default_1$s as eI,
  default_1$r as eJ,
  default_1$p as eK,
  default_1$o as eL,
  default_1$q as eM,
  default_1$n as eN,
  default_1$m as eO,
  default_1$l as eP,
  default_1$k as eQ,
  default_1$j as eR,
  default_1$i as eS,
  default_1$h as eT,
  default_1$g as eU,
  default_1$f as eV,
  default_1$d as eW,
  default_1$c as eX,
  default_1$e as eY,
  default_1$b as eZ,
  default_1$a as e_,
  Http as ea,
  StarRate as eb,
  Translate as ec,
  Palette as ed,
  Api as ee,
  Code as ef,
  Backup as eg,
  FormGroup as eh,
  HourglassEmpty as ei,
  MoreHoriz as ej,
  MoneyOff as ek,
  LinkIcon as el,
  FileDownload as em,
  Notes as en,
  default_1$W as eo,
  default_1$V as ep,
  Timer as eq,
  PieChart as er,
  Group as es,
  FlightTakeoff as et,
  DirectionsBoat as eu,
  DirectionsRailway as ev,
  DirectionsCar as ew,
  default_1$D as ex,
  default_1$x as ey,
  default_1$w as ez,
  useThemeProps$a as f,
  default_1$9 as f0,
  default_1$7 as f1,
  default_1$6 as f2,
  default_1$5 as f3,
  default_1$4 as f4,
  default_1$3 as f5,
  default_1$2 as f6,
  default_1$1 as f7,
  default_1 as f8,
  CardActionArea as f9,
  ScanIcon as fa,
  EventBusy as fb,
  CreditCardOff as fc,
  Remove as fd,
  generateUtilityClass$2 as g,
  useId as h,
  alpha$1 as i,
  createTheme as j,
  ThemeProvider as k,
  useMediaQuery as l,
  Box as m,
  Divider as n,
  ownerWindow as o,
  Tooltip as p,
  ListItem as q,
  ListItemButton as r,
  styled as s,
  ListItemIcon as t,
  useTheme$1 as u,
  Badge$1 as v,
  ListItemText as w,
  ExpandMore as x,
  Collapse as y,
  DashboardIcon as z
};
