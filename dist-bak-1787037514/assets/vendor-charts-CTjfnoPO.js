import { _ as _extends, L as _objectWithoutPropertiesLoose, X as animated, Y as useTransition, Z as useIsomorphicLayoutEffect, $ as globals_exports, N as clsx, a0 as PropTypes, a1 as to } from "./vendor-C0Ken1ns.js";
import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useTheme, a as useSlotProps, c as composeClasses, s as styled, g as generateUtilityClass, b as generateUtilityClasses, d as useForkRef, o as ownerWindow, e as useEnhancedEffect, f as useThemeProps, B as Box, T as Typography, N as NoSsr, P as Popper, h as useId } from "./vendor-mui-UhJuRAfR.js";
function constant$1(x2) {
  return function constant2() {
    return x2;
  };
}
const abs = Math.abs;
const atan2 = Math.atan2;
const cos = Math.cos;
const max = Math.max;
const min = Math.min;
const sin = Math.sin;
const sqrt$1 = Math.sqrt;
const epsilon$1 = 1e-12;
const pi$1 = Math.PI;
const halfPi = pi$1 / 2;
const tau$1 = 2 * pi$1;
function acos(x2) {
  return x2 > 1 ? 0 : x2 < -1 ? pi$1 : Math.acos(x2);
}
function asin(x2) {
  return x2 >= 1 ? halfPi : x2 <= -1 ? -halfPi : Math.asin(x2);
}
const pi = Math.PI, tau = 2 * pi, epsilon = 1e-6, tauEpsilon = tau - epsilon;
function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length; i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}
function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
  if (d > 15) return append;
  const k2 = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += Math.round(arguments[i] * k2) / k2 + strings[i];
    }
  };
}
class Path {
  constructor(digits) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null;
    this._ = "";
    this._append = digits == null ? append : appendRound(digits);
  }
  moveTo(x2, y2) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x2, y2) {
    this._append`L${this._x1 = +x2},${this._y1 = +y2}`;
  }
  quadraticCurveTo(x1, y1, x2, y2) {
    this._append`Q${+x1},${+y1},${this._x1 = +x2},${this._y1 = +y2}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x3, y3) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x3},${this._y1 = +y3}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    } else if (!(l01_2 > epsilon)) ;
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    } else {
      let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }
      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x2, y2, r, a0, a1, ccw) {
    x2 = +x2, y2 = +y2, r = +r, ccw = !!ccw;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x2 + dx, y0 = y2 + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }
    if (!r) return;
    if (da < 0) da = da % tau + tau;
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x2 - dx},${y2 - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    } else if (da > epsilon) {
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x2 + r * Math.cos(a1)},${this._y1 = y2 + r * Math.sin(a1)}`;
    }
  }
  rect(x2, y2, w, h) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
}
function withPath(shape) {
  let digits = 3;
  shape.digits = function(_) {
    if (!arguments.length) return digits;
    if (_ == null) {
      digits = null;
    } else {
      const d = Math.floor(_);
      if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    return shape;
  };
  return () => new Path(digits);
}
function arcInnerRadius(d) {
  return d.innerRadius;
}
function arcOuterRadius(d) {
  return d.outerRadius;
}
function arcStartAngle(d) {
  return d.startAngle;
}
function arcEndAngle(d) {
  return d.endAngle;
}
function arcPadAngle(d) {
  return d && d.padAngle;
}
function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
  var x10 = x1 - x0, y10 = y1 - y0, x32 = x3 - x2, y32 = y3 - y2, t = y32 * x10 - x32 * y10;
  if (t * t < epsilon$1) return;
  t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
  return [x0 + t * x10, y0 + t * y10];
}
function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
  var x01 = x0 - x1, y01 = y0 - y1, lo = (cw ? rc : -rc) / sqrt$1(x01 * x01 + y01 * y01), ox = lo * y01, oy = -lo * x01, x11 = x0 + ox, y11 = y0 + oy, x10 = x1 + ox, y10 = y1 + oy, x00 = (x11 + x10) / 2, y00 = (y11 + y10) / 2, dx = x10 - x11, dy = y10 - y11, d2 = dx * dx + dy * dy, r = r1 - rc, D = x11 * y10 - x10 * y11, d = (dy < 0 ? -1 : 1) * sqrt$1(max(0, r * r * d2 - D * D)), cx0 = (D * dy - dx * d) / d2, cy0 = (-D * dx - dy * d) / d2, cx1 = (D * dy + dx * d) / d2, cy1 = (-D * dx + dy * d) / d2, dx0 = cx0 - x00, dy0 = cy0 - y00, dx1 = cx1 - x00, dy1 = cy1 - y00;
  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;
  return {
    cx: cx0,
    cy: cy0,
    x01: -ox,
    y01: -oy,
    x11: cx0 * (r1 / r - 1),
    y11: cy0 * (r1 / r - 1)
  };
}
function d3Arc() {
  var innerRadius = arcInnerRadius, outerRadius = arcOuterRadius, cornerRadius = constant$1(0), padRadius = null, startAngle = arcStartAngle, endAngle = arcEndAngle, padAngle = arcPadAngle, context = null, path = withPath(arc);
  function arc() {
    var buffer, r, r0 = +innerRadius.apply(this, arguments), r1 = +outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) - halfPi, a1 = endAngle.apply(this, arguments) - halfPi, da = abs(a1 - a0), cw = a1 > a0;
    if (!context) context = buffer = path();
    if (r1 < r0) r = r1, r1 = r0, r0 = r;
    if (!(r1 > epsilon$1)) context.moveTo(0, 0);
    else if (da > tau$1 - epsilon$1) {
      context.moveTo(r1 * cos(a0), r1 * sin(a0));
      context.arc(0, 0, r1, a0, a1, !cw);
      if (r0 > epsilon$1) {
        context.moveTo(r0 * cos(a1), r0 * sin(a1));
        context.arc(0, 0, r0, a1, a0, cw);
      }
    } else {
      var a01 = a0, a11 = a1, a00 = a0, a10 = a1, da0 = da, da1 = da, ap = padAngle.apply(this, arguments) / 2, rp = ap > epsilon$1 && (padRadius ? +padRadius.apply(this, arguments) : sqrt$1(r0 * r0 + r1 * r1)), rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)), rc0 = rc, rc1 = rc, t02, t12;
      if (rp > epsilon$1) {
        var p0 = asin(rp / r0 * sin(ap)), p1 = asin(rp / r1 * sin(ap));
        if ((da0 -= p0 * 2) > epsilon$1) p0 *= cw ? 1 : -1, a00 += p0, a10 -= p0;
        else da0 = 0, a00 = a10 = (a0 + a1) / 2;
        if ((da1 -= p1 * 2) > epsilon$1) p1 *= cw ? 1 : -1, a01 += p1, a11 -= p1;
        else da1 = 0, a01 = a11 = (a0 + a1) / 2;
      }
      var x01 = r1 * cos(a01), y01 = r1 * sin(a01), x10 = r0 * cos(a10), y10 = r0 * sin(a10);
      if (rc > epsilon$1) {
        var x11 = r1 * cos(a11), y11 = r1 * sin(a11), x00 = r0 * cos(a00), y00 = r0 * sin(a00), oc;
        if (da < pi$1) {
          if (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10)) {
            var ax = x01 - oc[0], ay = y01 - oc[1], bx = x11 - oc[0], by = y11 - oc[1], kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt$1(ax * ax + ay * ay) * sqrt$1(bx * bx + by * by))) / 2), lc = sqrt$1(oc[0] * oc[0] + oc[1] * oc[1]);
            rc0 = min(rc, (r0 - lc) / (kc - 1));
            rc1 = min(rc, (r1 - lc) / (kc + 1));
          } else {
            rc0 = rc1 = 0;
          }
        }
      }
      if (!(da1 > epsilon$1)) context.moveTo(x01, y01);
      else if (rc1 > epsilon$1) {
        t02 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
        t12 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);
        context.moveTo(t02.cx + t02.x01, t02.cy + t02.y01);
        if (rc1 < rc) context.arc(t02.cx, t02.cy, rc1, atan2(t02.y01, t02.x01), atan2(t12.y01, t12.x01), !cw);
        else {
          context.arc(t02.cx, t02.cy, rc1, atan2(t02.y01, t02.x01), atan2(t02.y11, t02.x11), !cw);
          context.arc(0, 0, r1, atan2(t02.cy + t02.y11, t02.cx + t02.x11), atan2(t12.cy + t12.y11, t12.cx + t12.x11), !cw);
          context.arc(t12.cx, t12.cy, rc1, atan2(t12.y11, t12.x11), atan2(t12.y01, t12.x01), !cw);
        }
      } else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);
      if (!(r0 > epsilon$1) || !(da0 > epsilon$1)) context.lineTo(x10, y10);
      else if (rc0 > epsilon$1) {
        t02 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
        t12 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);
        context.lineTo(t02.cx + t02.x01, t02.cy + t02.y01);
        if (rc0 < rc) context.arc(t02.cx, t02.cy, rc0, atan2(t02.y01, t02.x01), atan2(t12.y01, t12.x01), !cw);
        else {
          context.arc(t02.cx, t02.cy, rc0, atan2(t02.y01, t02.x01), atan2(t02.y11, t02.x11), !cw);
          context.arc(0, 0, r0, atan2(t02.cy + t02.y11, t02.cx + t02.x11), atan2(t12.cy + t12.y11, t12.cx + t12.x11), cw);
          context.arc(t12.cx, t12.cy, rc0, atan2(t12.y11, t12.x11), atan2(t12.y01, t12.x01), !cw);
        }
      } else context.arc(0, 0, r0, a10, a00, cw);
    }
    context.closePath();
    if (buffer) return context = null, buffer + "" || null;
  }
  arc.centroid = function() {
    var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2, a2 = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$1 / 2;
    return [cos(a2) * r, sin(a2) * r];
  };
  arc.innerRadius = function(_) {
    return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : innerRadius;
  };
  arc.outerRadius = function(_) {
    return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : outerRadius;
  };
  arc.cornerRadius = function(_) {
    return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : cornerRadius;
  };
  arc.padRadius = function(_) {
    return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), arc) : padRadius;
  };
  arc.startAngle = function(_) {
    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : startAngle;
  };
  arc.endAngle = function(_) {
    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : endAngle;
  };
  arc.padAngle = function(_) {
    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : padAngle;
  };
  arc.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, arc) : context;
  };
  return arc;
}
function array(x2) {
  return typeof x2 === "object" && "length" in x2 ? x2 : Array.from(x2);
}
function Linear(context) {
  this._context = context;
}
Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
      default:
        this._context.lineTo(x2, y2);
        break;
    }
  }
};
function curveLinear(context) {
  return new Linear(context);
}
function x(p) {
  return p[0];
}
function y(p) {
  return p[1];
}
function d3Line(x$1, y$1) {
  var defined = constant$1(true), context = null, curve = curveLinear, output = null, path = withPath(line);
  x$1 = typeof x$1 === "function" ? x$1 : x$1 === void 0 ? x : constant$1(x$1);
  y$1 = typeof y$1 === "function" ? y$1 : y$1 === void 0 ? y : constant$1(y$1);
  function line(data) {
    var i, n = (data = array(data)).length, d, defined0 = false, buffer;
    if (context == null) output = curve(buffer = path());
    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
    }
    if (buffer) return output = null, buffer + "" || null;
  }
  line.x = function(_) {
    return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant$1(+_), line) : x$1;
  };
  line.y = function(_) {
    return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant$1(+_), line) : y$1;
  };
  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$1(!!_), line) : defined;
  };
  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };
  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };
  return line;
}
function d3Area(x0, y0, y1) {
  var x1 = null, defined = constant$1(true), context = null, curve = curveLinear, output = null, path = withPath(area);
  x0 = typeof x0 === "function" ? x0 : x0 === void 0 ? x : constant$1(+x0);
  y0 = typeof y0 === "function" ? y0 : y0 === void 0 ? constant$1(0) : constant$1(+y0);
  y1 = typeof y1 === "function" ? y1 : y1 === void 0 ? y : constant$1(+y1);
  function area(data) {
    var i, j, k2, n = (data = array(data)).length, d, defined0 = false, buffer, x0z = new Array(n), y0z = new Array(n);
    if (context == null) output = curve(buffer = path());
    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) {
          j = i;
          output.areaStart();
          output.lineStart();
        } else {
          output.lineEnd();
          output.lineStart();
          for (k2 = i - 1; k2 >= j; --k2) {
            output.point(x0z[k2], y0z[k2]);
          }
          output.lineEnd();
          output.areaEnd();
        }
      }
      if (defined0) {
        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
      }
    }
    if (buffer) return output = null, buffer + "" || null;
  }
  function arealine() {
    return d3Line().defined(defined).curve(curve).context(context);
  }
  area.x = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$1(+_), x1 = null, area) : x0;
  };
  area.x0 = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$1(+_), area) : x0;
  };
  area.x1 = function(_) {
    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), area) : x1;
  };
  area.y = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$1(+_), y1 = null, area) : y0;
  };
  area.y0 = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$1(+_), area) : y0;
  };
  area.y1 = function(_) {
    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), area) : y1;
  };
  area.lineX0 = area.lineY0 = function() {
    return arealine().x(x0).y(y0);
  };
  area.lineY1 = function() {
    return arealine().x(x0).y(y1);
  };
  area.lineX1 = function() {
    return arealine().x(x1).y(y0);
  };
  area.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$1(!!_), area) : defined;
  };
  area.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
  };
  area.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
  };
  return area;
}
function descending$1(a2, b) {
  return b < a2 ? -1 : b > a2 ? 1 : b >= a2 ? 0 : NaN;
}
function identity$2(d) {
  return d;
}
function d3Pie() {
  var value = identity$2, sortValues = descending$1, sort = null, startAngle = constant$1(0), endAngle = constant$1(tau$1), padAngle = constant$1(0);
  function pie(data) {
    var i, n = (data = array(data)).length, j, k2, sum2 = 0, index = new Array(n), arcs = new Array(n), a0 = +startAngle.apply(this, arguments), da = Math.min(tau$1, Math.max(-tau$1, endAngle.apply(this, arguments) - a0)), a1, p = Math.min(Math.abs(da) / n, padAngle.apply(this, arguments)), pa = p * (da < 0 ? -1 : 1), v;
    for (i = 0; i < n; ++i) {
      if ((v = arcs[index[i] = i] = +value(data[i], i, data)) > 0) {
        sum2 += v;
      }
    }
    if (sortValues != null) index.sort(function(i2, j2) {
      return sortValues(arcs[i2], arcs[j2]);
    });
    else if (sort != null) index.sort(function(i2, j2) {
      return sort(data[i2], data[j2]);
    });
    for (i = 0, k2 = sum2 ? (da - n * pa) / sum2 : 0; i < n; ++i, a0 = a1) {
      j = index[i], v = arcs[j], a1 = a0 + (v > 0 ? v * k2 : 0) + pa, arcs[j] = {
        data: data[j],
        index: i,
        value: v,
        startAngle: a0,
        endAngle: a1,
        padAngle: p
      };
    }
    return arcs;
  }
  pie.value = function(_) {
    return arguments.length ? (value = typeof _ === "function" ? _ : constant$1(+_), pie) : value;
  };
  pie.sortValues = function(_) {
    return arguments.length ? (sortValues = _, sort = null, pie) : sortValues;
  };
  pie.sort = function(_) {
    return arguments.length ? (sort = _, sortValues = null, pie) : sort;
  };
  pie.startAngle = function(_) {
    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : startAngle;
  };
  pie.endAngle = function(_) {
    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : endAngle;
  };
  pie.padAngle = function(_) {
    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : padAngle;
  };
  return pie;
}
const circle = {
  draw(context, size) {
    const r = sqrt$1(size / pi$1);
    context.moveTo(r, 0);
    context.arc(0, 0, r, 0, tau$1);
  }
};
const cross = {
  draw(context, size) {
    const r = sqrt$1(size / 5) / 2;
    context.moveTo(-3 * r, -r);
    context.lineTo(-r, -r);
    context.lineTo(-r, -3 * r);
    context.lineTo(r, -3 * r);
    context.lineTo(r, -r);
    context.lineTo(3 * r, -r);
    context.lineTo(3 * r, r);
    context.lineTo(r, r);
    context.lineTo(r, 3 * r);
    context.lineTo(-r, 3 * r);
    context.lineTo(-r, r);
    context.lineTo(-3 * r, r);
    context.closePath();
  }
};
const tan30 = sqrt$1(1 / 3);
const tan30_2 = tan30 * 2;
const diamond = {
  draw(context, size) {
    const y2 = sqrt$1(size / tan30_2);
    const x2 = y2 * tan30;
    context.moveTo(0, -y2);
    context.lineTo(x2, 0);
    context.lineTo(0, y2);
    context.lineTo(-x2, 0);
    context.closePath();
  }
};
const square = {
  draw(context, size) {
    const w = sqrt$1(size);
    const x2 = -w / 2;
    context.rect(x2, x2, w, w);
  }
};
const ka = 0.8908130915292852;
const kr = sin(pi$1 / 10) / sin(7 * pi$1 / 10);
const kx = sin(tau$1 / 10) * kr;
const ky = -cos(tau$1 / 10) * kr;
const star = {
  draw(context, size) {
    const r = sqrt$1(size * ka);
    const x2 = kx * r;
    const y2 = ky * r;
    context.moveTo(0, -r);
    context.lineTo(x2, y2);
    for (let i = 1; i < 5; ++i) {
      const a2 = tau$1 * i / 5;
      const c2 = cos(a2);
      const s2 = sin(a2);
      context.lineTo(s2 * r, -c2 * r);
      context.lineTo(c2 * x2 - s2 * y2, s2 * x2 + c2 * y2);
    }
    context.closePath();
  }
};
const sqrt3 = sqrt$1(3);
const triangle = {
  draw(context, size) {
    const y2 = -sqrt$1(size / (sqrt3 * 3));
    context.moveTo(0, y2 * 2);
    context.lineTo(-sqrt3 * y2, -y2);
    context.lineTo(sqrt3 * y2, -y2);
    context.closePath();
  }
};
const c = -0.5;
const s = sqrt$1(3) / 2;
const k = 1 / sqrt$1(12);
const a = (k / 2 + 1) * 3;
const wye = {
  draw(context, size) {
    const r = sqrt$1(size / a);
    const x0 = r / 2, y0 = r * k;
    const x1 = x0, y1 = r * k + r;
    const x2 = -x1, y2 = y1;
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(c * x0 - s * y0, s * x0 + c * y0);
    context.lineTo(c * x1 - s * y1, s * x1 + c * y1);
    context.lineTo(c * x2 - s * y2, s * x2 + c * y2);
    context.lineTo(c * x0 + s * y0, c * y0 - s * x0);
    context.lineTo(c * x1 + s * y1, c * y1 - s * x1);
    context.lineTo(c * x2 + s * y2, c * y2 - s * x2);
    context.closePath();
  }
};
const symbolsFill = [
  circle,
  cross,
  diamond,
  square,
  star,
  triangle,
  wye
];
function Symbol$1(type, size) {
  let context = null, path = withPath(symbol);
  type = typeof type === "function" ? type : constant$1(type || circle);
  size = typeof size === "function" ? size : constant$1(size === void 0 ? 64 : +size);
  function symbol() {
    let buffer;
    if (!context) context = buffer = path();
    type.apply(this, arguments).draw(context, +size.apply(this, arguments));
    if (buffer) return context = null, buffer + "" || null;
  }
  symbol.type = function(_) {
    return arguments.length ? (type = typeof _ === "function" ? _ : constant$1(_), symbol) : type;
  };
  symbol.size = function(_) {
    return arguments.length ? (size = typeof _ === "function" ? _ : constant$1(+_), symbol) : size;
  };
  symbol.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, symbol) : context;
  };
  return symbol;
}
function point$3(that, x2, y2) {
  that._context.bezierCurveTo(
    that._x1 + that._k * (that._x2 - that._x0),
    that._y1 + that._k * (that._y2 - that._y0),
    that._x2 + that._k * (that._x1 - x2),
    that._y2 + that._k * (that._y1 - y2),
    that._x2,
    that._y2
  );
}
function Cardinal(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
Cardinal.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        point$3(this, this._x1, this._y1);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        this._x1 = x2, this._y1 = y2;
        break;
      case 2:
        this._point = 3;
      default:
        point$3(this, x2, y2);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
(function custom(tension) {
  function cardinal(context) {
    return new Cardinal(context, tension);
  }
  cardinal.tension = function(tension2) {
    return custom(+tension2);
  };
  return cardinal;
})(0);
function point$2(that, x2, y2) {
  var x1 = that._x1, y1 = that._y1, x22 = that._x2, y22 = that._y2;
  if (that._l01_a > epsilon$1) {
    var a2 = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a, n = 3 * that._l01_a * (that._l01_a + that._l12_a);
    x1 = (x1 * a2 - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
    y1 = (y1 * a2 - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
  }
  if (that._l23_a > epsilon$1) {
    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a, m = 3 * that._l23_a * (that._l23_a + that._l12_a);
    x22 = (x22 * b + that._x1 * that._l23_2a - x2 * that._l12_2a) / m;
    y22 = (y22 * b + that._y1 * that._l23_2a - y2 * that._l12_2a) / m;
  }
  that._context.bezierCurveTo(x1, y1, x22, y22, that._x2, that._y2);
}
function CatmullRom(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRom.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        this.point(this._x2, this._y2);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    if (this._point) {
      var x23 = this._x2 - x2, y23 = this._y2 - y2;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
      default:
        point$2(this, x2, y2);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x2;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y2;
  }
};
const curveCatmullRom = function custom2(alpha) {
  function catmullRom(context) {
    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
  }
  catmullRom.alpha = function(alpha2) {
    return custom2(+alpha2);
  };
  return catmullRom;
}(0.5);
function sign(x2) {
  return x2 < 0 ? -1 : 1;
}
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0, h1 = x2 - that._x1, s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0), s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0), p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}
function point$1(that, t02, t12) {
  var x0 = that._x0, y0 = that._y0, x1 = that._x1, y1 = that._y1, dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t02, x1 - dx, y1 - dx * t12, x1, y1);
}
function MonotoneX(context) {
  this._context = context;
}
MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
      case 3:
        point$1(this, this._t0, slope2(this, this._t0));
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    var t12 = NaN;
    x2 = +x2, y2 = +y2;
    if (x2 === this._x1 && y2 === this._y1) return;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        point$1(this, slope2(this, t12 = slope3(this, x2, y2)), t12);
        break;
      default:
        point$1(this, this._t0, t12 = slope3(this, x2, y2));
        break;
    }
    this._x0 = this._x1, this._x1 = x2;
    this._y0 = this._y1, this._y1 = y2;
    this._t0 = t12;
  }
};
function MonotoneY(context) {
  this._context = new ReflectContext(context);
}
(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x2, y2) {
  MonotoneX.prototype.point.call(this, y2, x2);
};
function ReflectContext(context) {
  this._context = context;
}
ReflectContext.prototype = {
  moveTo: function(x2, y2) {
    this._context.moveTo(y2, x2);
  },
  closePath: function() {
    this._context.closePath();
  },
  lineTo: function(x2, y2) {
    this._context.lineTo(y2, x2);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x3, y3) {
    this._context.bezierCurveTo(y1, x1, y2, x2, y3, x3);
  }
};
function monotoneX(context) {
  return new MonotoneX(context);
}
function monotoneY(context) {
  return new MonotoneY(context);
}
function Natural(context) {
  this._context = context;
}
Natural.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = [];
    this._y = [];
  },
  lineEnd: function() {
    var x2 = this._x, y2 = this._y, n = x2.length;
    if (n) {
      this._line ? this._context.lineTo(x2[0], y2[0]) : this._context.moveTo(x2[0], y2[0]);
      if (n === 2) {
        this._context.lineTo(x2[1], y2[1]);
      } else {
        var px = controlPoints(x2), py = controlPoints(y2);
        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x2[i1], y2[i1]);
        }
      }
    }
    if (this._line || this._line !== 0 && n === 1) this._context.closePath();
    this._line = 1 - this._line;
    this._x = this._y = null;
  },
  point: function(x2, y2) {
    this._x.push(+x2);
    this._y.push(+y2);
  }
};
function controlPoints(x2) {
  var i, n = x2.length - 1, m, a2 = new Array(n), b = new Array(n), r = new Array(n);
  a2[0] = 0, b[0] = 2, r[0] = x2[0] + 2 * x2[1];
  for (i = 1; i < n - 1; ++i) a2[i] = 1, b[i] = 4, r[i] = 4 * x2[i] + 2 * x2[i + 1];
  a2[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x2[n - 1] + x2[n];
  for (i = 1; i < n; ++i) m = a2[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
  a2[n - 1] = r[n - 1] / b[n - 1];
  for (i = n - 2; i >= 0; --i) a2[i] = (r[i] - a2[i + 1]) / b[i];
  b[n - 1] = (x2[n] + a2[n - 1]) / 2;
  for (i = 0; i < n - 1; ++i) b[i] = 2 * x2[i + 1] - a2[i + 1];
  return [a2, b];
}
function curveNatural(context) {
  return new Natural(context);
}
function Step(context, t) {
  this._context = context;
  this._t = t;
}
Step.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = this._y = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    if (this._line >= 0) this._t = 1 - this._t, this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
      default: {
        if (this._t <= 0) {
          this._context.lineTo(this._x, y2);
          this._context.lineTo(x2, y2);
        } else {
          var x1 = this._x * (1 - this._t) + x2 * this._t;
          this._context.lineTo(x1, this._y);
          this._context.lineTo(x1, y2);
        }
        break;
      }
    }
    this._x = x2, this._y = y2;
  }
};
function curveStep(context) {
  return new Step(context, 0.5);
}
function stepBefore(context) {
  return new Step(context, 0);
}
function stepAfter(context) {
  return new Step(context, 1);
}
function d3StackOffsetNone(series, order) {
  if (!((n = series.length) > 1)) return;
  for (var i = 1, j, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
    s0 = s1, s1 = series[order[i]];
    for (j = 0; j < m; ++j) {
      s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
    }
  }
}
function d3StackOrderNone(series) {
  var n = series.length, o = new Array(n);
  while (--n >= 0) o[n] = n;
  return o;
}
function stackValue(d, key) {
  return d[key];
}
function stackSeries(key) {
  const series = [];
  series.key = key;
  return series;
}
function d3Stack() {
  var keys = constant$1([]), order = d3StackOrderNone, offset = d3StackOffsetNone, value = stackValue;
  function stack(data) {
    var sz = Array.from(keys.apply(this, arguments), stackSeries), i, n = sz.length, j = -1, oz;
    for (const d of data) {
      for (i = 0, ++j; i < n; ++i) {
        (sz[i][j] = [0, +value(d, sz[i].key, j, data)]).data = d;
      }
    }
    for (i = 0, oz = array(order(sz)); i < n; ++i) {
      sz[oz[i]].index = i;
    }
    offset(sz, oz);
    return sz;
  }
  stack.keys = function(_) {
    return arguments.length ? (keys = typeof _ === "function" ? _ : constant$1(Array.from(_)), stack) : keys;
  };
  stack.value = function(_) {
    return arguments.length ? (value = typeof _ === "function" ? _ : constant$1(+_), stack) : value;
  };
  stack.order = function(_) {
    return arguments.length ? (order = _ == null ? d3StackOrderNone : typeof _ === "function" ? _ : constant$1(Array.from(_)), stack) : order;
  };
  stack.offset = function(_) {
    return arguments.length ? (offset = _ == null ? d3StackOffsetNone : _, stack) : offset;
  };
  return stack;
}
function d3StackOffsetExpand(series, order) {
  if (!((n = series.length) > 0)) return;
  for (var i, n, j = 0, m = series[0].length, y2; j < m; ++j) {
    for (y2 = i = 0; i < n; ++i) y2 += series[i][j][1] || 0;
    if (y2) for (i = 0; i < n; ++i) series[i][j][1] /= y2;
  }
  d3StackOffsetNone(series, order);
}
function d3StackOffsetDiverging(series, order) {
  if (!((n = series.length) > 0)) return;
  for (var i, j = 0, d, dy, yp, yn, n, m = series[order[0]].length; j < m; ++j) {
    for (yp = yn = 0, i = 0; i < n; ++i) {
      if ((dy = (d = series[order[i]][j])[1] - d[0]) > 0) {
        d[0] = yp, d[1] = yp += dy;
      } else if (dy < 0) {
        d[1] = yn, d[0] = yn += dy;
      } else {
        d[0] = 0, d[1] = dy;
      }
    }
  }
}
function d3StackOffsetSilhouette(series, order) {
  if (!((n = series.length) > 0)) return;
  for (var j = 0, s0 = series[order[0]], n, m = s0.length; j < m; ++j) {
    for (var i = 0, y2 = 0; i < n; ++i) y2 += series[i][j][1] || 0;
    s0[j][1] += s0[j][0] = -y2 / 2;
  }
  d3StackOffsetNone(series, order);
}
function d3StackOffsetWiggle(series, order) {
  if (!((n = series.length) > 0) || !((m = (s0 = series[order[0]]).length) > 0)) return;
  for (var y2 = 0, j = 1, s0, m, n; j < m; ++j) {
    for (var i = 0, s1 = 0, s2 = 0; i < n; ++i) {
      var si = series[order[i]], sij0 = si[j][1] || 0, sij1 = si[j - 1][1] || 0, s3 = (sij0 - sij1) / 2;
      for (var k2 = 0; k2 < i; ++k2) {
        var sk = series[order[k2]], skj0 = sk[j][1] || 0, skj1 = sk[j - 1][1] || 0;
        s3 += skj0 - skj1;
      }
      s1 += sij0, s2 += s3 * sij0;
    }
    s0[j - 1][1] += s0[j - 1][0] = y2;
    if (s1) y2 -= s2 / s1;
  }
  s0[j - 1][1] += s0[j - 1][0] = y2;
  d3StackOffsetNone(series, order);
}
function d3StackOrderAppearance(series) {
  var peaks = series.map(peak);
  return d3StackOrderNone(series).sort(function(a2, b) {
    return peaks[a2] - peaks[b];
  });
}
function peak(series) {
  var i = -1, j = 0, n = series.length, vi, vj = -Infinity;
  while (++i < n) if ((vi = +series[i][1]) > vj) vj = vi, j = i;
  return j;
}
function d3StackOrderAscending(series) {
  var sums = series.map(sum);
  return d3StackOrderNone(series).sort(function(a2, b) {
    return sums[a2] - sums[b];
  });
}
function sum(series) {
  var s2 = 0, i = -1, n = series.length, v;
  while (++i < n) if (v = +series[i][1]) s2 += v;
  return s2;
}
function d3StackOrderDescending(series) {
  return d3StackOrderAscending(series).reverse();
}
function d3StackOrderInsideOut(series) {
  var n = series.length, i, j, sums = series.map(sum), order = d3StackOrderAppearance(series), top = 0, bottom = 0, tops = [], bottoms = [];
  for (i = 0; i < n; ++i) {
    j = order[i];
    if (top < bottom) {
      top += sums[j];
      tops.push(j);
    } else {
      bottom += sums[j];
      bottoms.push(j);
    }
  }
  return bottoms.reverse().concat(tops);
}
function d3StackOrderReverse(series) {
  return d3StackOrderNone(series).reverse();
}
const StackOrder = {
  /**
   * Series order such that the earliest series (according to the maximum value) is at the bottom.
   * */
  appearance: d3StackOrderAppearance,
  /**
   *  Series order such that the smallest series (according to the sum of values) is at the bottom.
   * */
  ascending: d3StackOrderAscending,
  /**
   * Series order such that the largest series (according to the sum of values) is at the bottom.
   */
  descending: d3StackOrderDescending,
  /**
   * Series order such that the earliest series (according to the maximum value) are on the inside and the later series are on the outside. This order is recommended for streamgraphs in conjunction with the wiggle offset. See Stacked Graphs—Geometry & Aesthetics by Byron & Wattenberg for more information.
   */
  insideOut: d3StackOrderInsideOut,
  /**
   * Given series order [0, 1, … n - 1] where n is the number of elements in series. Thus, the stack order is given by the key accessor.
   */
  none: d3StackOrderNone,
  /**
   * Reverse of the given series order [n - 1, n - 2, … 0] where n is the number of elements in series. Thus, the stack order is given by the reverse of the key accessor.
   */
  reverse: d3StackOrderReverse
};
const StackOffset = {
  /**
   * Applies a zero baseline and normalizes the values for each point such that the topline is always one.
   * */
  expand: d3StackOffsetExpand,
  /**
   * Positive values are stacked above zero, negative values are stacked below zero, and zero values are stacked at zero.
   * */
  diverging: d3StackOffsetDiverging,
  /**
   * Applies a zero baseline.
   * */
  none: d3StackOffsetNone,
  /**
   * Shifts the baseline down such that the center of the streamgraph is always at zero.
   * */
  silhouette: d3StackOffsetSilhouette,
  /**
   * Shifts the baseline so as to minimize the weighted wiggle of layers. This offset is recommended for streamgraphs in conjunction with the inside-out order. See Stacked Graphs—Geometry & Aesthetics by Bryon & Wattenberg for more information.
   * */
  wiggle: d3StackOffsetWiggle
};
const getStackingGroups = (params) => {
  const {
    series,
    seriesOrder,
    defaultStrategy
  } = params;
  const stackingGroups = [];
  const stackIndex = {};
  seriesOrder.forEach((id) => {
    const {
      stack,
      stackOrder,
      stackOffset
    } = series[id];
    if (stack === void 0) {
      stackingGroups.push({
        ids: [id],
        stackingOrder: StackOrder.none,
        stackingOffset: StackOffset.none
      });
    } else if (stackIndex[stack] === void 0) {
      var _ref, _ref2;
      stackIndex[stack] = stackingGroups.length;
      stackingGroups.push({
        ids: [id],
        stackingOrder: StackOrder[(_ref = stackOrder != null ? stackOrder : defaultStrategy == null ? void 0 : defaultStrategy.stackOrder) != null ? _ref : "none"],
        stackingOffset: StackOffset[(_ref2 = stackOffset != null ? stackOffset : defaultStrategy == null ? void 0 : defaultStrategy.stackOffset) != null ? _ref2 : "diverging"]
      });
    } else {
      stackingGroups[stackIndex[stack]].ids.push(id);
      if (stackOrder !== void 0) {
        stackingGroups[stackIndex[stack]].stackingOrder = StackOrder[stackOrder];
      }
      if (stackOffset !== void 0) {
        stackingGroups[stackIndex[stack]].stackingOffset = StackOffset[stackOffset];
      }
    }
  });
  return stackingGroups;
};
function defaultizeValueFormatter(series, defaultValueFormatter) {
  const defaultizedSeries = {};
  Object.keys(series).forEach((seriesId) => {
    var _series$seriesId$valu;
    defaultizedSeries[seriesId] = _extends({}, series[seriesId], {
      valueFormatter: (_series$seriesId$valu = series[seriesId].valueFormatter) != null ? _series$seriesId$valu : defaultValueFormatter
    });
  });
  return defaultizedSeries;
}
const formatter$3 = (params, dataset) => {
  var _ref;
  const {
    seriesOrder,
    series
  } = params;
  const stackingGroups = getStackingGroups(params);
  const d3Dataset = (_ref = dataset) != null ? _ref : [];
  seriesOrder.forEach((id) => {
    const data = series[id].data;
    if (data !== void 0) {
      data.forEach((value, index) => {
        if (d3Dataset.length <= index) {
          d3Dataset.push({
            [id]: value
          });
        } else {
          d3Dataset[index][id] = value;
        }
      });
    } else if (dataset === void 0) {
      throw new Error([`MUI-X-Charts: bar series with id='${id}' has no data.`, "Either provide a data property to the series or use the dataset prop."].join("\n"));
    }
  });
  const completedSeries = {};
  stackingGroups.forEach((stackingGroup) => {
    const {
      ids,
      stackingOffset,
      stackingOrder
    } = stackingGroup;
    const stackedSeries = d3Stack().keys(ids.map((id) => {
      const dataKey = series[id].dataKey;
      return series[id].data === void 0 && dataKey !== void 0 ? dataKey : id;
    })).value((d, key) => {
      var _d$key;
      return (_d$key = d[key]) != null ? _d$key : 0;
    }).order(stackingOrder).offset(stackingOffset)(d3Dataset);
    ids.forEach((id, index) => {
      const dataKey = series[id].dataKey;
      completedSeries[id] = _extends({
        layout: "vertical"
      }, series[id], {
        data: dataKey ? dataset.map((data) => {
          const value = data[dataKey];
          if (typeof value !== "number") {
            return 0;
          }
          return value;
        }) : series[id].data,
        stackedData: stackedSeries[index].map(([a2, b]) => [a2, b])
      });
    });
  });
  return {
    seriesOrder,
    stackingGroups,
    series: defaultizeValueFormatter(completedSeries, (v) => v == null ? void 0 : v.toLocaleString())
  };
};
const formatter$2 = ({
  series,
  seriesOrder
}) => {
  return {
    series: defaultizeValueFormatter(series, (v) => `(${v.x}, ${v.y})`),
    seriesOrder
  };
};
const formatter$1 = (params, dataset) => {
  var _ref;
  const {
    seriesOrder,
    series
  } = params;
  const stackingGroups = getStackingGroups(_extends({}, params, {
    defaultStrategy: {
      stackOffset: "none"
    }
  }));
  const d3Dataset = (_ref = dataset) != null ? _ref : [];
  seriesOrder.forEach((id) => {
    const data = series[id].data;
    if (data !== void 0) {
      data.forEach((value, index) => {
        if (d3Dataset.length <= index) {
          d3Dataset.push({
            [id]: value
          });
        } else {
          d3Dataset[index][id] = value;
        }
      });
    }
  });
  const completedSeries = {};
  stackingGroups.forEach((stackingGroup) => {
    const {
      ids,
      stackingOrder,
      stackingOffset
    } = stackingGroup;
    const stackedSeries = d3Stack().keys(ids.map((id) => {
      const dataKey = series[id].dataKey;
      return series[id].data === void 0 && dataKey !== void 0 ? dataKey : id;
    })).value((d, key) => {
      var _d$key;
      return (_d$key = d[key]) != null ? _d$key : 0;
    }).order(stackingOrder).offset(stackingOffset)(d3Dataset);
    ids.forEach((id, index) => {
      const dataKey = series[id].dataKey;
      completedSeries[id] = _extends({}, series[id], {
        data: dataKey ? dataset.map((data) => {
          const value = data[dataKey];
          if (typeof value !== "number") {
            return null;
          }
          return value;
        }) : series[id].data,
        stackedData: stackedSeries[index].map(([a2, b]) => [a2, b])
      });
    });
  });
  return {
    seriesOrder,
    stackingGroups,
    series: defaultizeValueFormatter(completedSeries, (v) => v == null ? void 0 : v.toLocaleString())
  };
};
const getSortingComparator = (comparator = "none") => {
  if (typeof comparator === "function") {
    return comparator;
  }
  switch (comparator) {
    case "none":
      return null;
    case "desc":
      return (a2, b) => b - a2;
    case "asc":
      return (a2, b) => a2 - b;
    default:
      return null;
  }
};
const formatter = (params) => {
  const {
    seriesOrder,
    series
  } = params;
  const defaultizedSeries = {};
  seriesOrder.forEach((seriesId) => {
    var _series$seriesId$star, _series$seriesId$endA, _series$seriesId$padd, _series$seriesId$sort;
    const arcs = d3Pie().startAngle(2 * Math.PI * ((_series$seriesId$star = series[seriesId].startAngle) != null ? _series$seriesId$star : 0) / 360).endAngle(2 * Math.PI * ((_series$seriesId$endA = series[seriesId].endAngle) != null ? _series$seriesId$endA : 360) / 360).padAngle(2 * Math.PI * ((_series$seriesId$padd = series[seriesId].paddingAngle) != null ? _series$seriesId$padd : 0) / 360).sortValues(getSortingComparator((_series$seriesId$sort = series[seriesId].sortingValues) != null ? _series$seriesId$sort : "none"))(series[seriesId].data.map((piePoint) => piePoint.value));
    defaultizedSeries[seriesId] = _extends({
      valueFormatter: (item) => item.value.toLocaleString()
    }, series[seriesId], {
      data: series[seriesId].data.map((item, index) => {
        var _item$id;
        return _extends({}, item, {
          id: (_item$id = item.id) != null ? _item$id : `auto-generated-pie-id-${seriesId}-${index}`
        }, arcs[index]);
      }).map((item) => {
        var _series$seriesId$valu, _series$seriesId$valu2, _series$seriesId;
        return _extends({}, item, {
          formattedValue: (_series$seriesId$valu = (_series$seriesId$valu2 = (_series$seriesId = series[seriesId]).valueFormatter) == null ? void 0 : _series$seriesId$valu2.call(_series$seriesId, item)) != null ? _series$seriesId$valu : item.value.toLocaleString()
        });
      })
    });
  });
  return {
    seriesOrder,
    series: defaultizedSeries
  };
};
const DEFAULT_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
function defaultizeColor(series, seriesIndex, colors = DEFAULT_COLORS) {
  if (series.type === "pie") {
    return _extends({}, series, {
      data: series.data.map((d, index) => _extends({
        color: colors[index % colors.length]
      }, d))
    });
  }
  return _extends({
    color: colors[seriesIndex % colors.length]
  }, series);
}
const blueberryTwilightPaletteLight = ["#02B2AF", "#2E96FF", "#B800D8", "#60009B", "#2731C8", "#03008D"];
const blueberryTwilightPaletteDark = ["#02B2AF", "#72CCFF", "#DA00FF", "#9001CB", "#2E96FF", "#3B48E0"];
const blueberryTwilightPalette = (mode) => mode === "dark" ? blueberryTwilightPaletteDark : blueberryTwilightPaletteLight;
const SeriesContext = /* @__PURE__ */ reactExports.createContext({});
const seriesTypeFormatter = {
  bar: formatter$3,
  scatter: formatter$2,
  line: formatter$1,
  pie: formatter
};
const formatSeries = (series, colors, dataset) => {
  const seriesGroups = {};
  series.forEach((seriesData, seriesIndex) => {
    var _seriesGroups$type;
    const {
      id = `auto-generated-id-${seriesIndex}`,
      type
    } = seriesData;
    if (seriesGroups[type] === void 0) {
      seriesGroups[type] = {
        series: {},
        seriesOrder: []
      };
    }
    if (((_seriesGroups$type = seriesGroups[type]) == null ? void 0 : _seriesGroups$type.series[id]) !== void 0) {
      throw new Error(`MUI-X-Charts: series' id "${id}" is not unique`);
    }
    seriesGroups[type].series[id] = _extends({
      id
    }, defaultizeColor(seriesData, seriesIndex, colors));
    seriesGroups[type].seriesOrder.push(id);
  });
  const formattedSeries = {};
  Object.keys(seriesTypeFormatter).forEach((type) => {
    if (seriesGroups[type] !== void 0) {
      var _seriesTypeFormatter$, _seriesTypeFormatter$2;
      formattedSeries[type] = (_seriesTypeFormatter$ = (_seriesTypeFormatter$2 = seriesTypeFormatter[type]) == null ? void 0 : _seriesTypeFormatter$2.call(seriesTypeFormatter, seriesGroups[type], dataset)) != null ? _seriesTypeFormatter$ : seriesGroups[type];
    }
  });
  return formattedSeries;
};
function SeriesContextProvider(props) {
  const {
    series,
    dataset,
    colors = blueberryTwilightPalette,
    children
  } = props;
  const theme = useTheme();
  const formattedSeries = reactExports.useMemo(() => formatSeries(series, typeof colors === "function" ? colors(theme.palette.mode) : colors, dataset), [series, colors, theme.palette.mode, dataset]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SeriesContext.Provider, {
    value: formattedSeries,
    children
  });
}
function ascending(a2, b) {
  return a2 == null || b == null ? NaN : a2 < b ? -1 : a2 > b ? 1 : a2 >= b ? 0 : NaN;
}
function descending(a2, b) {
  return a2 == null || b == null ? NaN : b < a2 ? -1 : b > a2 ? 1 : b >= a2 ? 0 : NaN;
}
function bisector(f) {
  let compare1, compare2, delta;
  if (f.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x2) => ascending(f(d), x2);
    delta = (d, x2) => f(d) - x2;
  } else {
    compare1 = f === ascending || f === descending ? f : zero$1;
    compare2 = f;
    delta = f;
  }
  function left(a2, x2, lo = 0, hi = a2.length) {
    if (lo < hi) {
      if (compare1(x2, x2) !== 0) return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a2[mid], x2) < 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function right(a2, x2, lo = 0, hi = a2.length) {
    if (lo < hi) {
      if (compare1(x2, x2) !== 0) return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a2[mid], x2) <= 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function center(a2, x2, lo = 0, hi = a2.length) {
    const i = left(a2, x2, lo, hi - 1);
    return i > lo && delta(a2[i - 1], x2) > -delta(a2[i], x2) ? i - 1 : i;
  }
  return { left, center, right };
}
function zero$1() {
  return 0;
}
function number$2(x2) {
  return x2 === null ? NaN : +x2;
}
const ascendingBisect = bisector(ascending);
const bisectRight = ascendingBisect.right;
bisector(number$2).center;
class InternMap extends Map {
  constructor(entries, key = keyof) {
    super();
    Object.defineProperties(this, { _intern: { value: /* @__PURE__ */ new Map() }, _key: { value: key } });
    if (entries != null) for (const [key2, value] of entries) this.set(key2, value);
  }
  get(key) {
    return super.get(intern_get(this, key));
  }
  has(key) {
    return super.has(intern_get(this, key));
  }
  set(key, value) {
    return super.set(intern_set(this, key), value);
  }
  delete(key) {
    return super.delete(intern_delete(this, key));
  }
}
function intern_get({ _intern, _key }, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}
function intern_set({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) return _intern.get(key);
  _intern.set(key, value);
  return value;
}
function intern_delete({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(key);
    _intern.delete(key);
  }
  return value;
}
function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}
const e10 = Math.sqrt(50), e5 = Math.sqrt(10), e2 = Math.sqrt(2);
function tickSpec(start, stop, count) {
  const step = (stop - start) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}
function ticks(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  const n = i2 - i1 + 1, ticks2 = new Array(n);
  if (reverse) {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) / -inc;
    else for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) * inc;
  } else {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) / -inc;
    else for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) * inc;
  }
  return ticks2;
}
function tickIncrement(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  return tickSpec(start, stop, count)[2];
}
function tickStep(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}
function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
  var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0, range2 = new Array(n);
  while (++i < n) {
    range2[i] = start + i * step;
  }
  return range2;
}
function initRange(domain, range2) {
  switch (arguments.length) {
    case 0:
      break;
    case 1:
      this.range(domain);
      break;
    default:
      this.range(range2).domain(domain);
      break;
  }
  return this;
}
const implicit = Symbol("implicit");
function ordinal() {
  var index = new InternMap(), domain = [], range2 = [], unknown = implicit;
  function scale(d) {
    let i = index.get(d);
    if (i === void 0) {
      if (unknown !== implicit) return unknown;
      index.set(d, i = domain.push(d) - 1);
    }
    return range2[i % range2.length];
  }
  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = [], index = new InternMap();
    for (const value of _) {
      if (index.has(value)) continue;
      index.set(value, domain.push(value) - 1);
    }
    return scale;
  };
  scale.range = function(_) {
    return arguments.length ? (range2 = Array.from(_), scale) : range2.slice();
  };
  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };
  scale.copy = function() {
    return ordinal(domain, range2).unknown(unknown);
  };
  initRange.apply(scale, arguments);
  return scale;
}
function band() {
  var scale = ordinal().unknown(void 0), domain = scale.domain, ordinalRange = scale.range, r0 = 0, r1 = 1, step, bandwidth, round = false, paddingInner = 0, paddingOuter = 0, align = 0.5;
  delete scale.unknown;
  function rescale() {
    var n = domain().length, reverse = r1 < r0, start = reverse ? r1 : r0, stop = reverse ? r0 : r1;
    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
    if (round) step = Math.floor(step);
    start += (stop - start - step * (n - paddingInner)) * align;
    bandwidth = step * (1 - paddingInner);
    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
    var values = range(n).map(function(i) {
      return start + step * i;
    });
    return ordinalRange(reverse ? values.reverse() : values);
  }
  scale.domain = function(_) {
    return arguments.length ? (domain(_), rescale()) : domain();
  };
  scale.range = function(_) {
    return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
  };
  scale.rangeRound = function(_) {
    return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
  };
  scale.bandwidth = function() {
    return bandwidth;
  };
  scale.step = function() {
    return step;
  };
  scale.round = function(_) {
    return arguments.length ? (round = !!_, rescale()) : round;
  };
  scale.padding = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
  };
  scale.paddingInner = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
  };
  scale.paddingOuter = function(_) {
    return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
  };
  scale.align = function(_) {
    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
  };
  scale.copy = function() {
    return band(domain(), [r0, r1]).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
  };
  return initRange.apply(rescale(), arguments);
}
function pointish(scale) {
  var copy2 = scale.copy;
  scale.padding = scale.paddingOuter;
  delete scale.paddingInner;
  delete scale.paddingOuter;
  scale.copy = function() {
    return pointish(copy2());
  };
  return scale;
}
function point() {
  return pointish(band.apply(null, arguments).paddingInner(1));
}
function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*", reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", reHex = /^#([0-9a-f]{3,8})$/, reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`), reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`), reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`), reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`), reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`), reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format2) {
  var m, l;
  format2 = (format2 + "").trim().toLowerCase();
  return (m = reHex.exec(format2)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format2)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format2)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format2)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format2)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format2) ? rgbn(named[format2]) : format2 === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a2) {
  if (a2 <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a2);
}
function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb$1(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define(Rgb, rgb$1, extend(Color, {
  brighter(k2) {
    k2 = k2 == null ? brighter : Math.pow(brighter, k2);
    return new Rgb(this.r * k2, this.g * k2, this.b * k2, this.opacity);
  },
  darker(k2) {
    k2 = k2 == null ? darker : Math.pow(darker, k2);
    return new Rgb(this.r * k2, this.g * k2, this.b * k2, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a2 = clampa(this.opacity);
  return `${a2 === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a2 === 1 ? ")" : `, ${a2})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s2, l, a2) {
  if (a2 <= 0) h = s2 = l = NaN;
  else if (l <= 0 || l >= 1) h = s2 = NaN;
  else if (s2 <= 0) h = NaN;
  return new Hsl(h, s2, l, a2);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r, g, b), max2 = Math.max(r, g, b), h = NaN, s2 = max2 - min2, l = (max2 + min2) / 2;
  if (s2) {
    if (r === max2) h = (g - b) / s2 + (g < b) * 6;
    else if (g === max2) h = (b - r) / s2 + 2;
    else h = (r - g) / s2 + 4;
    s2 /= l < 0.5 ? max2 + min2 : 2 - max2 - min2;
    h *= 60;
  } else {
    s2 = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s2, l, o.opacity);
}
function hsl(h, s2, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s2, l, opacity == null ? 1 : opacity);
}
function Hsl(h, s2, l, opacity) {
  this.h = +h;
  this.s = +s2;
  this.l = +l;
  this.opacity = +opacity;
}
define(Hsl, hsl, extend(Color, {
  brighter(k2) {
    k2 = k2 == null ? brighter : Math.pow(brighter, k2);
    return new Hsl(this.h, this.s, this.l * k2, this.opacity);
  },
  darker(k2) {
    k2 = k2 == null ? darker : Math.pow(darker, k2);
    return new Hsl(this.h, this.s, this.l * k2, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s2 = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s2, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a2 = clampa(this.opacity);
    return `${a2 === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a2 === 1 ? ")" : `, ${a2})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}
const constant = (x2) => () => x2;
function linear$1(a2, d) {
  return function(t) {
    return a2 + t * d;
  };
}
function exponential(a2, b, y2) {
  return a2 = Math.pow(a2, y2), b = Math.pow(b, y2) - a2, y2 = 1 / y2, function(t) {
    return Math.pow(a2 + t * b, y2);
  };
}
function gamma(y2) {
  return (y2 = +y2) === 1 ? nogamma : function(a2, b) {
    return b - a2 ? exponential(a2, b, y2) : constant(isNaN(a2) ? b : a2);
  };
}
function nogamma(a2, b) {
  var d = b - a2;
  return d ? linear$1(a2, d) : constant(isNaN(a2) ? b : a2);
}
const rgb = function rgbGamma(y2) {
  var color2 = gamma(y2);
  function rgb2(start, end) {
    var r = color2((start = rgb$1(start)).r, (end = rgb$1(end)).r), g = color2(start.g, end.g), b = color2(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
  rgb2.gamma = rgbGamma;
  return rgb2;
}(1);
function numberArray(a2, b) {
  if (!b) b = [];
  var n = a2 ? Math.min(b.length, a2.length) : 0, c2 = b.slice(), i;
  return function(t) {
    for (i = 0; i < n; ++i) c2[i] = a2[i] * (1 - t) + b[i] * t;
    return c2;
  };
}
function isNumberArray(x2) {
  return ArrayBuffer.isView(x2) && !(x2 instanceof DataView);
}
function genericArray(a2, b) {
  var nb = b ? b.length : 0, na = a2 ? Math.min(nb, a2.length) : 0, x2 = new Array(na), c2 = new Array(nb), i;
  for (i = 0; i < na; ++i) x2[i] = interpolate(a2[i], b[i]);
  for (; i < nb; ++i) c2[i] = b[i];
  return function(t) {
    for (i = 0; i < na; ++i) c2[i] = x2[i](t);
    return c2;
  };
}
function date$1(a2, b) {
  var d = /* @__PURE__ */ new Date();
  return a2 = +a2, b = +b, function(t) {
    return d.setTime(a2 * (1 - t) + b * t), d;
  };
}
function interpolateNumber(a2, b) {
  return a2 = +a2, b = +b, function(t) {
    return a2 * (1 - t) + b * t;
  };
}
function object(a2, b) {
  var i = {}, c2 = {}, k2;
  if (a2 === null || typeof a2 !== "object") a2 = {};
  if (b === null || typeof b !== "object") b = {};
  for (k2 in b) {
    if (k2 in a2) {
      i[k2] = interpolate(a2[k2], b[k2]);
    } else {
      c2[k2] = b[k2];
    }
  }
  return function(t) {
    for (k2 in i) c2[k2] = i[k2](t);
    return c2;
  };
}
var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, reB = new RegExp(reA.source, "g");
function zero(b) {
  return function() {
    return b;
  };
}
function one(b) {
  return function(t) {
    return b(t) + "";
  };
}
function string(a2, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s2 = [], q = [];
  a2 = a2 + "", b = b + "";
  while ((am = reA.exec(a2)) && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) {
      bs = b.slice(bi, bs);
      if (s2[i]) s2[i] += bs;
      else s2[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) {
      if (s2[i]) s2[i] += bm;
      else s2[++i] = bm;
    } else {
      s2[++i] = null;
      q.push({ i, x: interpolateNumber(am, bm) });
    }
    bi = reB.lastIndex;
  }
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s2[i]) s2[i] += bs;
    else s2[++i] = bs;
  }
  return s2.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
    for (var i2 = 0, o; i2 < b; ++i2) s2[(o = q[i2]).i] = o.x(t);
    return s2.join("");
  });
}
function interpolate(a2, b) {
  var t = typeof b, c2;
  return b == null || t === "boolean" ? constant(b) : (t === "number" ? interpolateNumber : t === "string" ? (c2 = color(b)) ? (b = c2, rgb) : string : b instanceof color ? rgb : b instanceof Date ? date$1 : isNumberArray(b) ? numberArray : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object : interpolateNumber)(a2, b);
}
function interpolateRound(a2, b) {
  return a2 = +a2, b = +b, function(t) {
    return Math.round(a2 * (1 - t) + b * t);
  };
}
function constants(x2) {
  return function() {
    return x2;
  };
}
function number$1(x2) {
  return +x2;
}
var unit = [0, 1];
function identity$1(x2) {
  return x2;
}
function normalize(a2, b) {
  return (b -= a2 = +a2) ? function(x2) {
    return (x2 - a2) / b;
  } : constants(isNaN(b) ? NaN : 0.5);
}
function clamper(a2, b) {
  var t;
  if (a2 > b) t = a2, a2 = b, b = t;
  return function(x2) {
    return Math.max(a2, Math.min(b, x2));
  };
}
function bimap(domain, range2, interpolate2) {
  var d0 = domain[0], d1 = domain[1], r0 = range2[0], r1 = range2[1];
  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate2(r1, r0);
  else d0 = normalize(d0, d1), r0 = interpolate2(r0, r1);
  return function(x2) {
    return r0(d0(x2));
  };
}
function polymap(domain, range2, interpolate2) {
  var j = Math.min(domain.length, range2.length) - 1, d = new Array(j), r = new Array(j), i = -1;
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range2 = range2.slice().reverse();
  }
  while (++i < j) {
    d[i] = normalize(domain[i], domain[i + 1]);
    r[i] = interpolate2(range2[i], range2[i + 1]);
  }
  return function(x2) {
    var i2 = bisectRight(domain, x2, 1, j) - 1;
    return r[i2](d[i2](x2));
  };
}
function copy(source, target) {
  return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
}
function transformer() {
  var domain = unit, range2 = unit, interpolate$1 = interpolate, transform, untransform, unknown, clamp = identity$1, piecewise, output, input;
  function rescale() {
    var n = Math.min(domain.length, range2.length);
    if (clamp !== identity$1) clamp = clamper(domain[0], domain[n - 1]);
    piecewise = n > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }
  function scale(x2) {
    return x2 == null || isNaN(x2 = +x2) ? unknown : (output || (output = piecewise(domain.map(transform), range2, interpolate$1)))(transform(clamp(x2)));
  }
  scale.invert = function(y2) {
    return clamp(untransform((input || (input = piecewise(range2, domain.map(transform), interpolateNumber)))(y2)));
  };
  scale.domain = function(_) {
    return arguments.length ? (domain = Array.from(_, number$1), rescale()) : domain.slice();
  };
  scale.range = function(_) {
    return arguments.length ? (range2 = Array.from(_), rescale()) : range2.slice();
  };
  scale.rangeRound = function(_) {
    return range2 = Array.from(_), interpolate$1 = interpolateRound, rescale();
  };
  scale.clamp = function(_) {
    return arguments.length ? (clamp = _ ? true : identity$1, rescale()) : clamp !== identity$1;
  };
  scale.interpolate = function(_) {
    return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
  };
  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };
  return function(t, u) {
    transform = t, untransform = u;
    return rescale();
  };
}
function continuous() {
  return transformer()(identity$1, identity$1);
}
function formatDecimal(x2) {
  return Math.abs(x2 = Math.round(x2)) >= 1e21 ? x2.toLocaleString("en").replace(/,/g, "") : x2.toString(10);
}
function formatDecimalParts(x2, p) {
  if (!isFinite(x2) || x2 === 0) return null;
  var i = (x2 = p ? x2.toExponential(p - 1) : x2.toExponential()).indexOf("e"), coefficient = x2.slice(0, i);
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x2.slice(i + 1)
  ];
}
function exponent(x2) {
  return x2 = formatDecimalParts(Math.abs(x2)), x2 ? x2[1] : NaN;
}
function formatGroup(grouping, thousands) {
  return function(value, width) {
    var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }
    return t.reverse().join(thousands);
  };
}
function formatNumerals(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
}
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}
formatSpecifier.prototype = FormatSpecifier.prototype;
function FormatSpecifier(specifier) {
  this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
  this.align = specifier.align === void 0 ? ">" : specifier.align + "";
  this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === void 0 ? void 0 : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === void 0 ? "" : specifier.type + "";
}
FormatSpecifier.prototype.toString = function() {
  return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
function formatTrim(s2) {
  out: for (var n = s2.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s2[i]) {
      case ".":
        i0 = i1 = i;
        break;
      case "0":
        if (i0 === 0) i0 = i;
        i1 = i;
        break;
      default:
        if (!+s2[i]) break out;
        if (i0 > 0) i0 = 0;
        break;
    }
  }
  return i0 > 0 ? s2.slice(0, i0) + s2.slice(i1 + 1) : s2;
}
var prefixExponent;
function formatPrefixAuto(x2, p) {
  var d = formatDecimalParts(x2, p);
  if (!d) return prefixExponent = void 0, x2.toPrecision(p);
  var coefficient = d[0], exponent2 = d[1], i = exponent2 - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent2 / 3))) * 3) + 1, n = coefficient.length;
  return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x2, Math.max(0, p + i - 1))[0];
}
function formatRounded(x2, p) {
  var d = formatDecimalParts(x2, p);
  if (!d) return x2 + "";
  var coefficient = d[0], exponent2 = d[1];
  return exponent2 < 0 ? "0." + new Array(-exponent2).join("0") + coefficient : coefficient.length > exponent2 + 1 ? coefficient.slice(0, exponent2 + 1) + "." + coefficient.slice(exponent2 + 1) : coefficient + new Array(exponent2 - coefficient.length + 2).join("0");
}
const formatTypes = {
  "%": (x2, p) => (x2 * 100).toFixed(p),
  "b": (x2) => Math.round(x2).toString(2),
  "c": (x2) => x2 + "",
  "d": formatDecimal,
  "e": (x2, p) => x2.toExponential(p),
  "f": (x2, p) => x2.toFixed(p),
  "g": (x2, p) => x2.toPrecision(p),
  "o": (x2) => Math.round(x2).toString(8),
  "p": (x2, p) => formatRounded(x2 * 100, p),
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": (x2) => Math.round(x2).toString(16).toUpperCase(),
  "x": (x2) => Math.round(x2).toString(16)
};
function identity(x2) {
  return x2;
}
var map = Array.prototype.map, prefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
function formatLocale$1(locale2) {
  var group = locale2.grouping === void 0 || locale2.thousands === void 0 ? identity : formatGroup(map.call(locale2.grouping, Number), locale2.thousands + ""), currencyPrefix = locale2.currency === void 0 ? "" : locale2.currency[0] + "", currencySuffix = locale2.currency === void 0 ? "" : locale2.currency[1] + "", decimal = locale2.decimal === void 0 ? "." : locale2.decimal + "", numerals = locale2.numerals === void 0 ? identity : formatNumerals(map.call(locale2.numerals, String)), percent = locale2.percent === void 0 ? "%" : locale2.percent + "", minus = locale2.minus === void 0 ? "−" : locale2.minus + "", nan = locale2.nan === void 0 ? "NaN" : locale2.nan + "";
  function newFormat(specifier, options) {
    specifier = formatSpecifier(specifier);
    var fill = specifier.fill, align = specifier.align, sign2 = specifier.sign, symbol = specifier.symbol, zero2 = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type = specifier.type;
    if (type === "n") comma = true, type = "g";
    else if (!formatTypes[type]) precision === void 0 && (precision = 12), trim = true, type = "g";
    if (zero2 || fill === "0" && align === "=") zero2 = true, fill = "0", align = "=";
    var prefix = (options && options.prefix !== void 0 ? options.prefix : "") + (symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : ""), suffix = (symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "") + (options && options.suffix !== void 0 ? options.suffix : "");
    var formatType = formatTypes[type], maybeSuffix = /[defgprs%]/.test(type);
    precision = precision === void 0 ? 6 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
    function format2(value) {
      var valuePrefix = prefix, valueSuffix = suffix, i, n, c2;
      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;
        var valueNegative = value < 0 || 1 / value < 0;
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
        if (trim) value = formatTrim(value);
        if (valueNegative && +value === 0 && sign2 !== "+") valueNegative = false;
        valuePrefix = (valueNegative ? sign2 === "(" ? sign2 : minus : sign2 === "-" || sign2 === "(" ? "" : sign2) + valuePrefix;
        valueSuffix = (type === "s" && !isNaN(value) && prefixExponent !== void 0 ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign2 === "(" ? ")" : "");
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c2 = value.charCodeAt(i), 48 > c2 || c2 > 57) {
              valueSuffix = (c2 === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }
      if (comma && !zero2) value = group(value, Infinity);
      var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill) : "";
      if (comma && zero2) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
      switch (align) {
        case "<":
          value = valuePrefix + value + valueSuffix + padding;
          break;
        case "=":
          value = valuePrefix + padding + value + valueSuffix;
          break;
        case "^":
          value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
          break;
        default:
          value = padding + valuePrefix + value + valueSuffix;
          break;
      }
      return numerals(value);
    }
    format2.toString = function() {
      return specifier + "";
    };
    return format2;
  }
  function formatPrefix2(specifier, value) {
    var e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3, k2 = Math.pow(10, -e), f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier), { suffix: prefixes[8 + e / 3] });
    return function(value2) {
      return f(k2 * value2);
    };
  }
  return {
    format: newFormat,
    formatPrefix: formatPrefix2
  };
}
var locale$1;
var format;
var formatPrefix;
defaultLocale$1({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});
function defaultLocale$1(definition) {
  locale$1 = formatLocale$1(definition);
  format = locale$1.format;
  formatPrefix = locale$1.formatPrefix;
  return locale$1;
}
function precisionFixed(step) {
  return Math.max(0, -exponent(Math.abs(step)));
}
function precisionPrefix(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
}
function precisionRound(step, max2) {
  step = Math.abs(step), max2 = Math.abs(max2) - step;
  return Math.max(0, exponent(max2) - exponent(step)) + 1;
}
function tickFormat(start, stop, count, specifier) {
  var step = tickStep(start, stop, count), precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
}
function linearish(scale) {
  var domain = scale.domain;
  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };
  scale.tickFormat = function(count, specifier) {
    var d = domain();
    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
  };
  scale.nice = function(count) {
    if (count == null) count = 10;
    var d = domain();
    var i0 = 0;
    var i1 = d.length - 1;
    var start = d[i0];
    var stop = d[i1];
    var prestep;
    var step;
    var maxIter = 10;
    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }
    while (maxIter-- > 0) {
      step = tickIncrement(start, stop, count);
      if (step === prestep) {
        d[i0] = start;
        d[i1] = stop;
        return domain(d);
      } else if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      } else {
        break;
      }
      prestep = step;
    }
    return scale;
  };
  return scale;
}
function linear() {
  var scale = continuous();
  scale.copy = function() {
    return copy(scale, linear());
  };
  initRange.apply(scale, arguments);
  return linearish(scale);
}
function nice(domain, interval) {
  domain = domain.slice();
  var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], t;
  if (x1 < x0) {
    t = i0, i0 = i1, i1 = t;
    t = x0, x0 = x1, x1 = t;
  }
  domain[i0] = interval.floor(x0);
  domain[i1] = interval.ceil(x1);
  return domain;
}
function transformLog(x2) {
  return Math.log(x2);
}
function transformExp(x2) {
  return Math.exp(x2);
}
function transformLogn(x2) {
  return -Math.log(-x2);
}
function transformExpn(x2) {
  return -Math.exp(-x2);
}
function pow10(x2) {
  return isFinite(x2) ? +("1e" + x2) : x2 < 0 ? 0 : x2;
}
function powp(base) {
  return base === 10 ? pow10 : base === Math.E ? Math.exp : (x2) => Math.pow(base, x2);
}
function logp(base) {
  return base === Math.E ? Math.log : base === 10 && Math.log10 || base === 2 && Math.log2 || (base = Math.log(base), (x2) => Math.log(x2) / base);
}
function reflect(f) {
  return (x2, k2) => -f(-x2, k2);
}
function loggish(transform) {
  const scale = transform(transformLog, transformExp);
  const domain = scale.domain;
  let base = 10;
  let logs;
  let pows;
  function rescale() {
    logs = logp(base), pows = powp(base);
    if (domain()[0] < 0) {
      logs = reflect(logs), pows = reflect(pows);
      transform(transformLogn, transformExpn);
    } else {
      transform(transformLog, transformExp);
    }
    return scale;
  }
  scale.base = function(_) {
    return arguments.length ? (base = +_, rescale()) : base;
  };
  scale.domain = function(_) {
    return arguments.length ? (domain(_), rescale()) : domain();
  };
  scale.ticks = (count) => {
    const d = domain();
    let u = d[0];
    let v = d[d.length - 1];
    const r = v < u;
    if (r) [u, v] = [v, u];
    let i = logs(u);
    let j = logs(v);
    let k2;
    let t;
    const n = count == null ? 10 : +count;
    let z = [];
    if (!(base % 1) && j - i < n) {
      i = Math.floor(i), j = Math.ceil(j);
      if (u > 0) for (; i <= j; ++i) {
        for (k2 = 1; k2 < base; ++k2) {
          t = i < 0 ? k2 / pows(-i) : k2 * pows(i);
          if (t < u) continue;
          if (t > v) break;
          z.push(t);
        }
      }
      else for (; i <= j; ++i) {
        for (k2 = base - 1; k2 >= 1; --k2) {
          t = i > 0 ? k2 / pows(-i) : k2 * pows(i);
          if (t < u) continue;
          if (t > v) break;
          z.push(t);
        }
      }
      if (z.length * 2 < n) z = ticks(u, v, n);
    } else {
      z = ticks(i, j, Math.min(j - i, n)).map(pows);
    }
    return r ? z.reverse() : z;
  };
  scale.tickFormat = (count, specifier) => {
    if (count == null) count = 10;
    if (specifier == null) specifier = base === 10 ? "s" : ",";
    if (typeof specifier !== "function") {
      if (!(base % 1) && (specifier = formatSpecifier(specifier)).precision == null) specifier.trim = true;
      specifier = format(specifier);
    }
    if (count === Infinity) return specifier;
    const k2 = Math.max(1, base * count / scale.ticks().length);
    return (d) => {
      let i = d / pows(Math.round(logs(d)));
      if (i * base < base - 0.5) i *= base;
      return i <= k2 ? specifier(d) : "";
    };
  };
  scale.nice = () => {
    return domain(nice(domain(), {
      floor: (x2) => pows(Math.floor(logs(x2))),
      ceil: (x2) => pows(Math.ceil(logs(x2)))
    }));
  };
  return scale;
}
function log() {
  const scale = loggish(transformer()).domain([1, 10]);
  scale.copy = () => copy(scale, log()).base(scale.base());
  initRange.apply(scale, arguments);
  return scale;
}
function transformPow(exponent2) {
  return function(x2) {
    return x2 < 0 ? -Math.pow(-x2, exponent2) : Math.pow(x2, exponent2);
  };
}
function transformSqrt(x2) {
  return x2 < 0 ? -Math.sqrt(-x2) : Math.sqrt(x2);
}
function transformSquare(x2) {
  return x2 < 0 ? -x2 * x2 : x2 * x2;
}
function powish(transform) {
  var scale = transform(identity$1, identity$1), exponent2 = 1;
  function rescale() {
    return exponent2 === 1 ? transform(identity$1, identity$1) : exponent2 === 0.5 ? transform(transformSqrt, transformSquare) : transform(transformPow(exponent2), transformPow(1 / exponent2));
  }
  scale.exponent = function(_) {
    return arguments.length ? (exponent2 = +_, rescale()) : exponent2;
  };
  return linearish(scale);
}
function pow() {
  var scale = powish(transformer());
  scale.copy = function() {
    return copy(scale, pow()).exponent(scale.exponent());
  };
  initRange.apply(scale, arguments);
  return scale;
}
function sqrt() {
  return pow.apply(null, arguments).exponent(0.5);
}
const t0 = /* @__PURE__ */ new Date(), t1 = /* @__PURE__ */ new Date();
function timeInterval(floori, offseti, count, field) {
  function interval(date2) {
    return floori(date2 = arguments.length === 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(+date2)), date2;
  }
  interval.floor = (date2) => {
    return floori(date2 = /* @__PURE__ */ new Date(+date2)), date2;
  };
  interval.ceil = (date2) => {
    return floori(date2 = new Date(date2 - 1)), offseti(date2, 1), floori(date2), date2;
  };
  interval.round = (date2) => {
    const d0 = interval(date2), d1 = interval.ceil(date2);
    return date2 - d0 < d1 - date2 ? d0 : d1;
  };
  interval.offset = (date2, step) => {
    return offseti(date2 = /* @__PURE__ */ new Date(+date2), step == null ? 1 : Math.floor(step)), date2;
  };
  interval.range = (start, stop, step) => {
    const range2 = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range2;
    let previous;
    do
      range2.push(previous = /* @__PURE__ */ new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range2;
  };
  interval.filter = (test) => {
    return timeInterval((date2) => {
      if (date2 >= date2) while (floori(date2), !test(date2)) date2.setTime(date2 - 1);
    }, (date2, step) => {
      if (date2 >= date2) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date2, -1), !test(date2)) {
          }
        }
        else while (--step >= 0) {
          while (offseti(date2, 1), !test(date2)) {
          }
        }
      }
    });
  };
  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };
    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null : !(step > 1) ? interval : interval.filter(field ? (d) => field(d) % step === 0 : (d) => interval.count(0, d) % step === 0);
    };
  }
  return interval;
}
const millisecond = timeInterval(() => {
}, (date2, step) => {
  date2.setTime(+date2 + step);
}, (start, end) => {
  return end - start;
});
millisecond.every = (k2) => {
  k2 = Math.floor(k2);
  if (!isFinite(k2) || !(k2 > 0)) return null;
  if (!(k2 > 1)) return millisecond;
  return timeInterval((date2) => {
    date2.setTime(Math.floor(date2 / k2) * k2);
  }, (date2, step) => {
    date2.setTime(+date2 + step * k2);
  }, (start, end) => {
    return (end - start) / k2;
  });
};
millisecond.range;
const durationSecond = 1e3;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;
const durationMonth = durationDay * 30;
const durationYear = durationDay * 365;
const second = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds());
}, (date2, step) => {
  date2.setTime(+date2 + step * durationSecond);
}, (start, end) => {
  return (end - start) / durationSecond;
}, (date2) => {
  return date2.getUTCSeconds();
});
second.range;
const timeMinute = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds() - date2.getSeconds() * durationSecond);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date2) => {
  return date2.getMinutes();
});
timeMinute.range;
const utcMinute = timeInterval((date2) => {
  date2.setUTCSeconds(0, 0);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date2) => {
  return date2.getUTCMinutes();
});
utcMinute.range;
const timeHour = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds() - date2.getSeconds() * durationSecond - date2.getMinutes() * durationMinute);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date2) => {
  return date2.getHours();
});
timeHour.range;
const utcHour = timeInterval((date2) => {
  date2.setUTCMinutes(0, 0, 0);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date2) => {
  return date2.getUTCHours();
});
utcHour.range;
const timeDay = timeInterval(
  (date2) => date2.setHours(0, 0, 0, 0),
  (date2, step) => date2.setDate(date2.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  (date2) => date2.getDate() - 1
);
timeDay.range;
const utcDay = timeInterval((date2) => {
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCDate(date2.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date2) => {
  return date2.getUTCDate() - 1;
});
utcDay.range;
const unixDay = timeInterval((date2) => {
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCDate(date2.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date2) => {
  return Math.floor(date2 / durationDay);
});
unixDay.range;
function timeWeekday(i) {
  return timeInterval((date2) => {
    date2.setDate(date2.getDate() - (date2.getDay() + 7 - i) % 7);
    date2.setHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setDate(date2.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}
const timeSunday = timeWeekday(0);
const timeMonday = timeWeekday(1);
const timeTuesday = timeWeekday(2);
const timeWednesday = timeWeekday(3);
const timeThursday = timeWeekday(4);
const timeFriday = timeWeekday(5);
const timeSaturday = timeWeekday(6);
timeSunday.range;
timeMonday.range;
timeTuesday.range;
timeWednesday.range;
timeThursday.range;
timeFriday.range;
timeSaturday.range;
function utcWeekday(i) {
  return timeInterval((date2) => {
    date2.setUTCDate(date2.getUTCDate() - (date2.getUTCDay() + 7 - i) % 7);
    date2.setUTCHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setUTCDate(date2.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}
const utcSunday = utcWeekday(0);
const utcMonday = utcWeekday(1);
const utcTuesday = utcWeekday(2);
const utcWednesday = utcWeekday(3);
const utcThursday = utcWeekday(4);
const utcFriday = utcWeekday(5);
const utcSaturday = utcWeekday(6);
utcSunday.range;
utcMonday.range;
utcTuesday.range;
utcWednesday.range;
utcThursday.range;
utcFriday.range;
utcSaturday.range;
const timeMonth = timeInterval((date2) => {
  date2.setDate(1);
  date2.setHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setMonth(date2.getMonth() + step);
}, (start, end) => {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, (date2) => {
  return date2.getMonth();
});
timeMonth.range;
const utcMonth = timeInterval((date2) => {
  date2.setUTCDate(1);
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCMonth(date2.getUTCMonth() + step);
}, (start, end) => {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, (date2) => {
  return date2.getUTCMonth();
});
utcMonth.range;
const timeYear = timeInterval((date2) => {
  date2.setMonth(0, 1);
  date2.setHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setFullYear(date2.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date2) => {
  return date2.getFullYear();
});
timeYear.every = (k2) => {
  return !isFinite(k2 = Math.floor(k2)) || !(k2 > 0) ? null : timeInterval((date2) => {
    date2.setFullYear(Math.floor(date2.getFullYear() / k2) * k2);
    date2.setMonth(0, 1);
    date2.setHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setFullYear(date2.getFullYear() + step * k2);
  });
};
timeYear.range;
const utcYear = timeInterval((date2) => {
  date2.setUTCMonth(0, 1);
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCFullYear(date2.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date2) => {
  return date2.getUTCFullYear();
});
utcYear.every = (k2) => {
  return !isFinite(k2 = Math.floor(k2)) || !(k2 > 0) ? null : timeInterval((date2) => {
    date2.setUTCFullYear(Math.floor(date2.getUTCFullYear() / k2) * k2);
    date2.setUTCMonth(0, 1);
    date2.setUTCHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setUTCFullYear(date2.getUTCFullYear() + step * k2);
  });
};
utcYear.range;
function ticker(year, month, week, day, hour, minute) {
  const tickIntervals = [
    [second, 1, durationSecond],
    [second, 5, 5 * durationSecond],
    [second, 15, 15 * durationSecond],
    [second, 30, 30 * durationSecond],
    [minute, 1, durationMinute],
    [minute, 5, 5 * durationMinute],
    [minute, 15, 15 * durationMinute],
    [minute, 30, 30 * durationMinute],
    [hour, 1, durationHour],
    [hour, 3, 3 * durationHour],
    [hour, 6, 6 * durationHour],
    [hour, 12, 12 * durationHour],
    [day, 1, durationDay],
    [day, 2, 2 * durationDay],
    [week, 1, durationWeek],
    [month, 1, durationMonth],
    [month, 3, 3 * durationMonth],
    [year, 1, durationYear]
  ];
  function ticks2(start, stop, count) {
    const reverse = stop < start;
    if (reverse) [start, stop] = [stop, start];
    const interval = count && typeof count.range === "function" ? count : tickInterval(start, stop, count);
    const ticks3 = interval ? interval.range(start, +stop + 1) : [];
    return reverse ? ticks3.reverse() : ticks3;
  }
  function tickInterval(start, stop, count) {
    const target = Math.abs(stop - start) / count;
    const i = bisector(([, , step2]) => step2).right(tickIntervals, target);
    if (i === tickIntervals.length) return year.every(tickStep(start / durationYear, stop / durationYear, count));
    if (i === 0) return millisecond.every(Math.max(tickStep(start, stop, count), 1));
    const [t, step] = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
    return t.every(step);
  }
  return [ticks2, tickInterval];
}
const [utcTicks, utcTickInterval] = ticker(utcYear, utcMonth, utcSunday, unixDay, utcHour, utcMinute);
const [timeTicks, timeTickInterval] = ticker(timeYear, timeMonth, timeSunday, timeDay, timeHour, timeMinute);
function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date2 = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date2.setFullYear(d.y);
    return date2;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}
function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date2 = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date2.setUTCFullYear(d.y);
    return date2;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}
function newDate(y2, m, d) {
  return { y: y2, m, d, H: 0, M: 0, S: 0, L: 0 };
}
function formatLocale(locale2) {
  var locale_dateTime = locale2.dateTime, locale_date = locale2.date, locale_time = locale2.time, locale_periods = locale2.periods, locale_weekdays = locale2.days, locale_shortWeekdays = locale2.shortDays, locale_months = locale2.months, locale_shortMonths = locale2.shortMonths;
  var periodRe = formatRe(locale_periods), periodLookup = formatLookup(locale_periods), weekdayRe = formatRe(locale_weekdays), weekdayLookup = formatLookup(locale_weekdays), shortWeekdayRe = formatRe(locale_shortWeekdays), shortWeekdayLookup = formatLookup(locale_shortWeekdays), monthRe = formatRe(locale_months), monthLookup = formatLookup(locale_months), shortMonthRe = formatRe(locale_shortMonths), shortMonthLookup = formatLookup(locale_shortMonths);
  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };
  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };
  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);
  function newFormat(specifier, formats2) {
    return function(date2) {
      var string2 = [], i = -1, j = 0, n = specifier.length, c2, pad2, format2;
      if (!(date2 instanceof Date)) date2 = /* @__PURE__ */ new Date(+date2);
      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string2.push(specifier.slice(j, i));
          if ((pad2 = pads[c2 = specifier.charAt(++i)]) != null) c2 = specifier.charAt(++i);
          else pad2 = c2 === "e" ? " " : "0";
          if (format2 = formats2[c2]) c2 = format2(date2, pad2);
          string2.push(c2);
          j = i + 1;
        }
      }
      string2.push(specifier.slice(j, i));
      return string2.join("");
    };
  }
  function newParse(specifier, Z) {
    return function(string2) {
      var d = newDate(1900, void 0, 1), i = parseSpecifier(d, specifier, string2 += "", 0), week, day;
      if (i != string2.length) return null;
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1e3 + ("L" in d ? d.L : 0));
      if (Z && !("Z" in d)) d.Z = 0;
      if ("p" in d) d.H = d.H % 12 + d.p * 12;
      if (d.m === void 0) d.m = "q" in d ? d.q : 0;
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
          week = timeDay.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }
      return localDate(d);
    };
  }
  function parseSpecifier(d, specifier, string2, j) {
    var i = 0, n = specifier.length, m = string2.length, c2, parse;
    while (i < n) {
      if (j >= m) return -1;
      c2 = specifier.charCodeAt(i++);
      if (c2 === 37) {
        c2 = specifier.charAt(i++);
        parse = parses[c2 in pads ? specifier.charAt(i++) : c2];
        if (!parse || (j = parse(d, string2, j)) < 0) return -1;
      } else if (c2 != string2.charCodeAt(j++)) {
        return -1;
      }
    }
    return j;
  }
  function parsePeriod(d, string2, i) {
    var n = periodRe.exec(string2.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseShortWeekday(d, string2, i) {
    var n = shortWeekdayRe.exec(string2.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseWeekday(d, string2, i) {
    var n = weekdayRe.exec(string2.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseShortMonth(d, string2, i) {
    var n = shortMonthRe.exec(string2.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseMonth(d, string2, i) {
    var n = monthRe.exec(string2.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseLocaleDateTime(d, string2, i) {
    return parseSpecifier(d, locale_dateTime, string2, i);
  }
  function parseLocaleDate(d, string2, i) {
    return parseSpecifier(d, locale_date, string2, i);
  }
  function parseLocaleTime(d, string2, i) {
    return parseSpecifier(d, locale_time, string2, i);
  }
  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }
  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }
  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }
  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }
  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }
  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }
  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }
  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }
  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }
  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }
  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }
  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }
  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() {
        return specifier;
      };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() {
        return specifier;
      };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() {
        return specifier;
      };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() {
        return specifier;
      };
      return p;
    }
  };
}
var pads = { "-": "", "_": " ", "0": "0" }, numberRe = /^\s*\d+/, percentRe = /^%/, requoteRe = /[\\^$*+?|[\]().{}]/g;
function pad(value, fill, width) {
  var sign2 = value < 0 ? "-" : "", string2 = (sign2 ? -value : value) + "", length = string2.length;
  return sign2 + (length < width ? new Array(width - length + 1).join(fill) + string2 : string2);
}
function requote(s2) {
  return s2.replace(requoteRe, "\\$&");
}
function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}
function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}
function parseWeekdayNumberSunday(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}
function parseWeekdayNumberMonday(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberSunday(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberISO(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberMonday(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}
function parseFullYear(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}
function parseYear(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2e3), i + n[0].length) : -1;
}
function parseZone(d, string2, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string2.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}
function parseQuarter(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}
function parseMonthNumber(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}
function parseDayOfMonth(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}
function parseDayOfYear(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}
function parseHour24(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}
function parseMinutes(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}
function parseSeconds(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}
function parseMilliseconds(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}
function parseMicroseconds(d, string2, i) {
  var n = numberRe.exec(string2.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1e3), i + n[0].length) : -1;
}
function parseLiteralPercent(d, string2, i) {
  var n = percentRe.exec(string2.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}
function parseUnixTimestamp(d, string2, i) {
  var n = numberRe.exec(string2.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}
function parseUnixTimestampSeconds(d, string2, i) {
  var n = numberRe.exec(string2.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}
function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}
function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}
function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}
function formatDayOfYear(d, p) {
  return pad(1 + timeDay.count(timeYear(d), d), p, 3);
}
function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}
function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}
function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}
function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}
function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}
function formatWeekdayNumberMonday(d) {
  var day = d.getDay();
  return day === 0 ? 7 : day;
}
function formatWeekNumberSunday(d, p) {
  return pad(timeSunday.count(timeYear(d) - 1, d), p, 2);
}
function dISO(d) {
  var day = d.getDay();
  return day >= 4 || day === 0 ? timeThursday(d) : timeThursday.ceil(d);
}
function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
}
function formatWeekdayNumberSunday(d) {
  return d.getDay();
}
function formatWeekNumberMonday(d, p) {
  return pad(timeMonday.count(timeYear(d) - 1, d), p, 2);
}
function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}
function formatYearISO(d, p) {
  d = dISO(d);
  return pad(d.getFullYear() % 100, p, 2);
}
function formatFullYear(d, p) {
  return pad(d.getFullYear() % 1e4, p, 4);
}
function formatFullYearISO(d, p) {
  var day = d.getDay();
  d = day >= 4 || day === 0 ? timeThursday(d) : timeThursday.ceil(d);
  return pad(d.getFullYear() % 1e4, p, 4);
}
function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+")) + pad(z / 60 | 0, "0", 2) + pad(z % 60, "0", 2);
}
function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}
function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}
function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}
function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}
function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}
function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}
function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}
function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}
function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}
function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}
function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
}
function UTCdISO(d) {
  var day = d.getUTCDay();
  return day >= 4 || day === 0 ? utcThursday(d) : utcThursday.ceil(d);
}
function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}
function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}
function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
}
function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}
function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad(d.getUTCFullYear() % 100, p, 2);
}
function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 1e4, p, 4);
}
function formatUTCFullYearISO(d, p) {
  var day = d.getUTCDay();
  d = day >= 4 || day === 0 ? utcThursday(d) : utcThursday.ceil(d);
  return pad(d.getUTCFullYear() % 1e4, p, 4);
}
function formatUTCZone() {
  return "+0000";
}
function formatLiteralPercent() {
  return "%";
}
function formatUnixTimestamp(d) {
  return +d;
}
function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1e3);
}
var locale;
var timeFormat;
var utcFormat;
defaultLocale({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});
function defaultLocale(definition) {
  locale = formatLocale(definition);
  timeFormat = locale.format;
  locale.parse;
  utcFormat = locale.utcFormat;
  locale.utcParse;
  return locale;
}
function date(t) {
  return new Date(t);
}
function number(t) {
  return t instanceof Date ? +t : +/* @__PURE__ */ new Date(+t);
}
function calendar(ticks2, tickInterval, year, month, week, day, hour, minute, second2, format2) {
  var scale = continuous(), invert = scale.invert, domain = scale.domain;
  var formatMillisecond = format2(".%L"), formatSecond = format2(":%S"), formatMinute = format2("%I:%M"), formatHour = format2("%I %p"), formatDay = format2("%a %d"), formatWeek = format2("%b %d"), formatMonth = format2("%B"), formatYear2 = format2("%Y");
  function tickFormat2(date2) {
    return (second2(date2) < date2 ? formatMillisecond : minute(date2) < date2 ? formatSecond : hour(date2) < date2 ? formatMinute : day(date2) < date2 ? formatHour : month(date2) < date2 ? week(date2) < date2 ? formatDay : formatWeek : year(date2) < date2 ? formatMonth : formatYear2)(date2);
  }
  scale.invert = function(y2) {
    return new Date(invert(y2));
  };
  scale.domain = function(_) {
    return arguments.length ? domain(Array.from(_, number)) : domain().map(date);
  };
  scale.ticks = function(interval) {
    var d = domain();
    return ticks2(d[0], d[d.length - 1], interval == null ? 10 : interval);
  };
  scale.tickFormat = function(count, specifier) {
    return specifier == null ? tickFormat2 : format2(specifier);
  };
  scale.nice = function(interval) {
    var d = domain();
    if (!interval || typeof interval.range !== "function") interval = tickInterval(d[0], d[d.length - 1], interval == null ? 10 : interval);
    return interval ? domain(nice(d, interval)) : scale;
  };
  scale.copy = function() {
    return copy(scale, calendar(ticks2, tickInterval, year, month, week, day, hour, minute, second2, format2));
  };
  return scale;
}
function time() {
  return initRange.apply(calendar(timeTicks, timeTickInterval, timeYear, timeMonth, timeSunday, timeDay, timeHour, timeMinute, second, timeFormat).domain([new Date(2e3, 0, 1), new Date(2e3, 0, 2)]), arguments);
}
function utcTime() {
  return initRange.apply(calendar(utcTicks, utcTickInterval, utcYear, utcMonth, utcSunday, utcDay, utcHour, utcMinute, second, utcFormat).domain([Date.UTC(2e3, 0, 1), Date.UTC(2e3, 0, 2)]), arguments);
}
const getBaseExtremum = (params) => {
  var _axis$data, _axis$data2;
  const {
    axis
  } = params;
  const minX = Math.min(...(_axis$data = axis.data) != null ? _axis$data : []);
  const maxX = Math.max(...(_axis$data2 = axis.data) != null ? _axis$data2 : []);
  return [minX, maxX];
};
const getValueExtremum = (params) => {
  const {
    series,
    axis,
    isDefaultAxis
  } = params;
  return Object.keys(series).filter((seriesId) => series[seriesId].yAxisKey === axis.id || isDefaultAxis && series[seriesId].yAxisKey === void 0).reduce((acc, seriesId) => {
    const [seriesMin, seriesMax] = series[seriesId].stackedData.reduce((seriesAcc, values) => [Math.min(...values, ...seriesAcc[0] === null ? [] : [seriesAcc[0]]), Math.max(...values, ...seriesAcc[1] === null ? [] : [seriesAcc[1]])], series[seriesId].stackedData[0]);
    return [acc[0] === null ? seriesMin : Math.min(seriesMin, acc[0]), acc[1] === null ? seriesMax : Math.max(seriesMax, acc[1])];
  }, [null, null]);
};
const getExtremumX$2 = (params) => {
  const isHorizontal = Object.keys(params.series).some((seriesId) => params.series[seriesId].layout === "horizontal");
  if (isHorizontal) {
    return getValueExtremum(params);
  }
  return getBaseExtremum(params);
};
const getExtremumY$2 = (params) => {
  const isHorizontal = Object.keys(params.series).some((seriesId) => params.series[seriesId].layout === "horizontal");
  if (isHorizontal) {
    return getBaseExtremum(params);
  }
  return getValueExtremum(params);
};
const mergeMinMax = (acc, val) => {
  if (acc[0] === null || acc[1] === null) {
    return val;
  }
  if (val[0] === null || val[1] === null) {
    return acc;
  }
  return [Math.min(acc[0], val[0]), Math.max(acc[1], val[1])];
};
const getExtremumX$1 = (params) => {
  const {
    series,
    axis,
    isDefaultAxis
  } = params;
  return Object.keys(series).filter((seriesId) => series[seriesId].xAxisKey === axis.id || series[seriesId].xAxisKey === void 0 && isDefaultAxis).reduce((acc, seriesId) => {
    const seriesMinMax = series[seriesId].data.reduce((accSeries, {
      x: x2
    }) => {
      const val = [x2, x2];
      return mergeMinMax(accSeries, val);
    }, [null, null]);
    return mergeMinMax(acc, seriesMinMax);
  }, [null, null]);
};
const getExtremumY$1 = (params) => {
  const {
    series,
    axis,
    isDefaultAxis
  } = params;
  return Object.keys(series).filter((seriesId) => series[seriesId].yAxisKey === axis.id || series[seriesId].yAxisKey === void 0 && isDefaultAxis).reduce((acc, seriesId) => {
    const seriesMinMax = series[seriesId].data.reduce((accSeries, {
      y: y2
    }) => {
      const val = [y2, y2];
      return mergeMinMax(accSeries, val);
    }, [null, null]);
    return mergeMinMax(acc, seriesMinMax);
  }, [null, null]);
};
const getExtremumX = (params) => {
  var _axis$data, _axis$data2;
  const {
    axis
  } = params;
  const minX = Math.min(...(_axis$data = axis.data) != null ? _axis$data : []);
  const maxX = Math.max(...(_axis$data2 = axis.data) != null ? _axis$data2 : []);
  return [minX, maxX];
};
function getSeriesExtremums(getValues, stackedData) {
  if (stackedData.length === 0) {
    return [null, null];
  }
  return stackedData.reduce((seriesAcc, stackedValue) => {
    const [base, value] = getValues(stackedValue);
    if (seriesAcc[0] === null) {
      return [Math.min(base, value), Math.max(base, value)];
    }
    return [Math.min(base, value, seriesAcc[0]), Math.max(base, value, seriesAcc[1])];
  }, getValues(stackedData[0]));
}
const getExtremumY = (params) => {
  const {
    series,
    axis,
    isDefaultAxis
  } = params;
  return Object.keys(series).filter((seriesId) => series[seriesId].yAxisKey === axis.id || isDefaultAxis && series[seriesId].yAxisKey === void 0).reduce((acc, seriesId) => {
    const {
      area,
      stackedData
    } = series[seriesId];
    const isArea = area !== void 0;
    const getValues = isArea ? (d) => d : (d) => [d[1], d[1]];
    const seriesExtremums = getSeriesExtremums(getValues, stackedData);
    if (acc[0] === null) {
      return seriesExtremums;
    }
    if (seriesExtremums[0] === null) {
      return acc;
    }
    const [seriesMin, seriesMax] = seriesExtremums;
    return [Math.min(seriesMin, acc[0]), Math.max(seriesMax, acc[1])];
  }, [null, null]);
};
function isBandScaleConfig(scaleConfig) {
  return scaleConfig.scaleType === "band";
}
function isPointScaleConfig(scaleConfig) {
  return scaleConfig.scaleType === "point";
}
function getScale(scaleType, domain, range2) {
  switch (scaleType) {
    case "log":
      return log(domain, range2);
    case "pow":
      return pow(domain, range2);
    case "sqrt":
      return sqrt(domain, range2);
    case "time":
      return time(domain, range2);
    case "utc":
      return utcTime(domain, range2);
    default:
      return linear(domain, range2);
  }
}
const DEFAULT_X_AXIS_KEY = "DEFAULT_X_AXIS_KEY";
const DEFAULT_Y_AXIS_KEY = "DEFAULT_Y_AXIS_KEY";
const DEFAULT_MARGINS = {
  top: 50,
  bottom: 50,
  left: 50,
  right: 50
};
const useChartDimensions$1 = (width, height, margin) => {
  const defaultizedMargin = _extends({}, DEFAULT_MARGINS, margin);
  const drawingArea = reactExports.useMemo(() => ({
    left: defaultizedMargin.left,
    top: defaultizedMargin.top,
    right: defaultizedMargin.right,
    bottom: defaultizedMargin.bottom,
    width: Math.max(0, width - defaultizedMargin.left - defaultizedMargin.right),
    height: Math.max(0, height - defaultizedMargin.top - defaultizedMargin.bottom)
  }), [width, height, defaultizedMargin.top, defaultizedMargin.bottom, defaultizedMargin.left, defaultizedMargin.right]);
  return drawingArea;
};
const DrawingContext = /* @__PURE__ */ reactExports.createContext({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  height: 300,
  width: 400
});
const SVGContext = /* @__PURE__ */ reactExports.createContext({
  current: null
});
function DrawingProvider(props) {
  const {
    width,
    height,
    margin,
    svgRef,
    children
  } = props;
  const drawingArea = useChartDimensions$1(width, height, margin);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SVGContext.Provider, {
    value: svgRef,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(DrawingContext.Provider, {
      value: drawingArea,
      children
    })
  });
}
function isBandScale(scale) {
  return scale.bandwidth !== void 0;
}
function getTickNumber(params) {
  const {
    tickMaxStep,
    tickMinStep,
    tickNumber,
    range: range2,
    domain
  } = params;
  const maxTicks = tickMinStep === void 0 ? 999 : Math.floor(Math.abs(domain[1] - domain[0]) / tickMinStep);
  const minTicks = tickMaxStep === void 0 ? 2 : Math.ceil(Math.abs(domain[1] - domain[0]) / tickMaxStep);
  const defaultizedTickNumber = tickNumber != null ? tickNumber : Math.floor(Math.abs(range2[1] - range2[0]) / 50);
  return Math.min(maxTicks, Math.max(minTicks, defaultizedTickNumber));
}
function useTicks(options) {
  const {
    scale,
    tickNumber,
    valueFormatter,
    tickInterval
  } = options;
  return reactExports.useMemo(() => {
    if (isBandScale(scale)) {
      const domain = scale.domain();
      if (scale.bandwidth() > 0) {
        return [...domain.map((value) => {
          var _valueFormatter;
          return {
            value,
            formattedValue: (_valueFormatter = valueFormatter == null ? void 0 : valueFormatter(value)) != null ? _valueFormatter : `${value}`,
            offset: scale(value) - (scale.step() - scale.bandwidth()) / 2,
            labelOffset: scale.step() / 2
          };
        }), {
          formattedValue: void 0,
          offset: scale.range()[1],
          labelOffset: 0
        }];
      }
      const filteredDomain = typeof tickInterval === "function" && domain.filter(tickInterval) || typeof tickInterval === "object" && tickInterval || domain;
      return filteredDomain.map((value) => {
        var _valueFormatter2;
        return {
          value,
          formattedValue: (_valueFormatter2 = valueFormatter == null ? void 0 : valueFormatter(value)) != null ? _valueFormatter2 : `${value}`,
          offset: scale(value),
          labelOffset: 0
        };
      });
    }
    const ticks2 = typeof tickInterval === "object" ? tickInterval : scale.ticks(tickNumber);
    return ticks2.map((value) => {
      var _valueFormatter3;
      return {
        value,
        formattedValue: (_valueFormatter3 = valueFormatter == null ? void 0 : valueFormatter(value)) != null ? _valueFormatter3 : scale.tickFormat(tickNumber)(value),
        offset: scale(value),
        labelOffset: 0
      };
    });
  }, [tickNumber, scale, valueFormatter, tickInterval]);
}
const DEFAULT_CATEGORY_GAP_RATIO = 0.2;
const DEFAULT_BAR_GAP_RATIO = 0.1;
const xExtremumGetters = {
  bar: getExtremumX$2,
  scatter: getExtremumX$1,
  line: getExtremumX
};
const yExtremumGetters = {
  bar: getExtremumY$2,
  scatter: getExtremumY$1,
  line: getExtremumY
};
const CartesianContext = /* @__PURE__ */ reactExports.createContext({
  xAxis: {},
  yAxis: {},
  xAxisIds: [],
  yAxisIds: []
});
function CartesianContextProvider(props) {
  const {
    xAxis: inXAxis,
    yAxis: inYAxis,
    dataset,
    children
  } = props;
  const formattedSeries = reactExports.useContext(SeriesContext);
  const drawingArea = reactExports.useContext(DrawingContext);
  const xAxis = reactExports.useMemo(() => inXAxis == null ? void 0 : inXAxis.map((axisConfig) => {
    const dataKey = axisConfig.dataKey;
    if (dataKey === void 0 || axisConfig.data !== void 0) {
      return axisConfig;
    }
    if (dataset === void 0) {
      throw Error("MUI-X-Charts: x-axis uses `dataKey` but no `dataset` is provided.");
    }
    return _extends({}, axisConfig, {
      data: dataset.map((d) => d[dataKey])
    });
  }), [inXAxis, dataset]);
  const yAxis = reactExports.useMemo(() => inYAxis == null ? void 0 : inYAxis.map((axisConfig) => {
    const dataKey = axisConfig.dataKey;
    if (dataKey === void 0 || axisConfig.data !== void 0) {
      return axisConfig;
    }
    if (dataset === void 0) {
      throw Error("MUI-X-Charts: y-axis uses `dataKey` but no `dataset` is provided.");
    }
    return _extends({}, axisConfig, {
      data: dataset.map((d) => d[dataKey])
    });
  }), [inYAxis, dataset]);
  const value = reactExports.useMemo(() => {
    var _xAxis$map, _yAxis$map;
    const axisExtremumCallback = (acc, chartType, axis, getters, isDefaultAxis) => {
      var _ref, _formattedSeries$char;
      const getter = getters[chartType];
      const series = (_ref = (_formattedSeries$char = formattedSeries[chartType]) == null ? void 0 : _formattedSeries$char.series) != null ? _ref : {};
      const [minChartTypeData, maxChartTypeData] = getter({
        series,
        axis,
        isDefaultAxis
      });
      const [minData, maxData] = acc;
      if (minData === null || maxData === null) {
        return [minChartTypeData, maxChartTypeData];
      }
      if (minChartTypeData === null || maxChartTypeData === null) {
        return [minData, maxData];
      }
      return [Math.min(minChartTypeData, minData), Math.max(maxChartTypeData, maxData)];
    };
    const getAxisExtremum = (axis, getters, isDefaultAxis) => {
      const charTypes = Object.keys(getters);
      return charTypes.reduce((acc, charType) => axisExtremumCallback(acc, charType, axis, getters, isDefaultAxis), [null, null]);
    };
    const allXAxis = [
      ...(_xAxis$map = xAxis == null ? void 0 : xAxis.map((axis, index) => _extends({
        id: `deaultized-x-axis-${index}`
      }, axis))) != null ? _xAxis$map : [],
      // Allows to specify an axis with id=DEFAULT_X_AXIS_KEY
      ...xAxis === void 0 || xAxis.findIndex(({
        id
      }) => id === DEFAULT_X_AXIS_KEY) === -1 ? [{
        id: DEFAULT_X_AXIS_KEY,
        scaleType: "linear"
      }] : []
    ];
    const completedXAxis = {};
    allXAxis.forEach((axis, axisIndex) => {
      var _axis$scaleType, _axis$min, _axis$max, _axis$min2, _axis$max2;
      const isDefaultAxis = axisIndex === 0;
      const [minData, maxData] = getAxisExtremum(axis, xExtremumGetters, isDefaultAxis);
      const range2 = axis.reverse ? [drawingArea.left + drawingArea.width, drawingArea.left] : [drawingArea.left, drawingArea.left + drawingArea.width];
      if (isBandScaleConfig(axis)) {
        var _axis$categoryGapRati, _axis$barGapRatio;
        const categoryGapRatio = (_axis$categoryGapRati = axis.categoryGapRatio) != null ? _axis$categoryGapRati : DEFAULT_CATEGORY_GAP_RATIO;
        const barGapRatio = (_axis$barGapRatio = axis.barGapRatio) != null ? _axis$barGapRatio : DEFAULT_BAR_GAP_RATIO;
        completedXAxis[axis.id] = _extends({
          categoryGapRatio,
          barGapRatio
        }, axis, {
          scale: band(axis.data, range2).paddingInner(categoryGapRatio).paddingOuter(categoryGapRatio / 2),
          tickNumber: axis.data.length
        });
      }
      if (isPointScaleConfig(axis)) {
        completedXAxis[axis.id] = _extends({}, axis, {
          scale: point(axis.data, range2),
          tickNumber: axis.data.length
        });
      }
      if (axis.scaleType === "band" || axis.scaleType === "point") {
        return;
      }
      const scaleType = (_axis$scaleType = axis.scaleType) != null ? _axis$scaleType : "linear";
      const extremums = [(_axis$min = axis.min) != null ? _axis$min : minData, (_axis$max = axis.max) != null ? _axis$max : maxData];
      const tickNumber = getTickNumber(_extends({}, axis, {
        range: range2,
        domain: extremums
      }));
      const niceScale = getScale(scaleType, extremums, range2).nice(tickNumber);
      const niceDomain = niceScale.domain();
      const domain = [(_axis$min2 = axis.min) != null ? _axis$min2 : niceDomain[0], (_axis$max2 = axis.max) != null ? _axis$max2 : niceDomain[1]];
      completedXAxis[axis.id] = _extends({}, axis, {
        scaleType,
        scale: niceScale.domain(domain),
        tickNumber
      });
    });
    const allYAxis = [...(_yAxis$map = yAxis == null ? void 0 : yAxis.map((axis, index) => _extends({
      id: `deaultized-y-axis-${index}`
    }, axis))) != null ? _yAxis$map : [], ...yAxis === void 0 || yAxis.findIndex(({
      id
    }) => id === DEFAULT_Y_AXIS_KEY) === -1 ? [{
      id: DEFAULT_Y_AXIS_KEY,
      scaleType: "linear"
    }] : []];
    const completedYAxis = {};
    allYAxis.forEach((axis, axisIndex) => {
      var _axis$scaleType2, _axis$min3, _axis$max3, _axis$min4, _axis$max4;
      const isDefaultAxis = axisIndex === 0;
      const [minData, maxData] = getAxisExtremum(axis, yExtremumGetters, isDefaultAxis);
      const range2 = axis.reverse ? [drawingArea.top, drawingArea.top + drawingArea.height] : [drawingArea.top + drawingArea.height, drawingArea.top];
      if (isBandScaleConfig(axis)) {
        var _axis$categoryGapRati2;
        const categoryGapRatio = (_axis$categoryGapRati2 = axis.categoryGapRatio) != null ? _axis$categoryGapRati2 : DEFAULT_CATEGORY_GAP_RATIO;
        completedYAxis[axis.id] = _extends({
          categoryGapRatio,
          barGapRatio: 0
        }, axis, {
          scale: band(axis.data, [range2[1], range2[0]]).paddingInner(categoryGapRatio).paddingOuter(categoryGapRatio / 2),
          tickNumber: axis.data.length
        });
      }
      if (isPointScaleConfig(axis)) {
        completedYAxis[axis.id] = _extends({}, axis, {
          scale: point(axis.data, [range2[1], range2[0]]),
          tickNumber: axis.data.length
        });
      }
      if (axis.scaleType === "band" || axis.scaleType === "point") {
        return;
      }
      const scaleType = (_axis$scaleType2 = axis.scaleType) != null ? _axis$scaleType2 : "linear";
      const extremums = [(_axis$min3 = axis.min) != null ? _axis$min3 : minData, (_axis$max3 = axis.max) != null ? _axis$max3 : maxData];
      const tickNumber = getTickNumber(_extends({}, axis, {
        range: range2,
        domain: extremums
      }));
      const niceScale = getScale(scaleType, extremums, range2).nice(tickNumber);
      const niceDomain = niceScale.domain();
      const domain = [(_axis$min4 = axis.min) != null ? _axis$min4 : niceDomain[0], (_axis$max4 = axis.max) != null ? _axis$max4 : niceDomain[1]];
      completedYAxis[axis.id] = _extends({}, axis, {
        scaleType,
        scale: niceScale.domain(domain),
        tickNumber
      });
    });
    return {
      xAxis: completedXAxis,
      yAxis: completedYAxis,
      xAxisIds: allXAxis.map(({
        id
      }) => id),
      yAxisIds: allYAxis.map(({
        id
      }) => id)
    };
  }, [drawingArea.height, drawingArea.left, drawingArea.top, drawingArea.width, formattedSeries, xAxis, yAxis]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianContext.Provider, {
    value,
    children
  });
}
const InteractionContext = /* @__PURE__ */ reactExports.createContext({
  item: null,
  axis: {
    x: null,
    y: null
  },
  dispatch: () => null
});
const dataReducer$1 = (prevState, action) => {
  switch (action.type) {
    case "enterItem":
      return _extends({}, prevState, {
        item: action.data
      });
    case "leaveItem":
      if (prevState.item === null || Object.keys(action.data).some((key) => action.data[key] !== prevState.item[key])) {
        return prevState;
      }
      return _extends({}, prevState, {
        item: null
      });
    case "updateAxis":
      return _extends({}, prevState, {
        axis: action.data
      });
    default:
      return prevState;
  }
};
function InteractionProvider(props) {
  const {
    children
  } = props;
  const [data, dispatch] = reactExports.useReducer(dataReducer$1, {
    item: null,
    axis: {
      x: null,
      y: null
    }
  });
  const value = reactExports.useMemo(() => _extends({}, data, {
    dispatch
  }), [data]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(InteractionContext.Provider, {
    value,
    children
  });
}
const defaultScope = {
  highlighted: "none",
  faded: "none"
};
const HighlighContext = /* @__PURE__ */ reactExports.createContext({
  item: null,
  scope: defaultScope,
  dispatch: () => null
});
const dataReducer = (prevState, action) => {
  switch (action.type) {
    case "enterItem":
      return _extends({}, prevState, {
        item: action.item,
        scope: _extends({}, defaultScope, action.scope)
      });
    case "leaveItem":
      if (prevState.item === null || Object.keys(action.item).some((key) => action.item[key] !== prevState.item[key])) {
        return prevState;
      }
      return _extends({}, prevState, {
        item: null
      });
    default:
      return prevState;
  }
};
function HighlightProvider(props) {
  const {
    children
  } = props;
  const [data, dispatch] = reactExports.useReducer(dataReducer, {
    item: null,
    scope: defaultScope
  });
  const value = reactExports.useMemo(() => _extends({}, data, {
    dispatch
  }), [data]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HighlighContext.Provider, {
    value,
    children
  });
}
const useInteractionItemProps = (scope) => {
  const {
    dispatch: dispatchInteraction
  } = reactExports.useContext(InteractionContext);
  const {
    dispatch: dispatchHighlight
  } = reactExports.useContext(HighlighContext);
  const getInteractionItemProps = (data) => {
    const onMouseEnter = () => {
      dispatchInteraction({
        type: "enterItem",
        data
      });
      dispatchHighlight({
        type: "enterItem",
        item: data,
        scope
      });
    };
    const onMouseLeave = () => {
      dispatchInteraction({
        type: "leaveItem",
        data
      });
      dispatchHighlight({
        type: "leaveItem",
        item: data
      });
    };
    return {
      onMouseEnter,
      onMouseLeave
    };
  };
  return getInteractionItemProps;
};
const getIsHighlighted = (selectedItem, currentItem, highlightScope) => {
  if (!(highlightScope != null && highlightScope.highlighted) || highlightScope.highlighted === "none" || selectedItem === null) {
    return false;
  }
  const isSeriesSelected = selectedItem.type === currentItem.type && selectedItem.seriesId === currentItem.seriesId;
  if (!isSeriesSelected) {
    return false;
  }
  if (highlightScope.highlighted === "series") {
    return isSeriesSelected;
  }
  return selectedItem.dataIndex !== void 0 && selectedItem.dataIndex === currentItem.dataIndex;
};
const getIsFaded = (selectedItem, currentItem, highlightScope) => {
  if (!(highlightScope != null && highlightScope.faded) || highlightScope.faded === "none" || selectedItem === null) {
    return false;
  }
  const isSeriesSelected = selectedItem.type === currentItem.type && selectedItem.seriesId === currentItem.seriesId;
  if (highlightScope.faded === "series") {
    return isSeriesSelected && selectedItem.dataIndex !== currentItem.dataIndex;
  }
  if (highlightScope.faded === "global") {
    if (!isSeriesSelected) {
      return true;
    }
    return selectedItem.dataIndex !== void 0 && selectedItem.dataIndex !== currentItem.dataIndex;
  }
  return false;
};
const _excluded$j = ["id", "dataIndex", "classes", "color", "highlightScope", "slots", "slotProps", "style"];
function getBarElementUtilityClass(slot) {
  return generateUtilityClass("MuiBarElement", slot);
}
generateUtilityClasses("MuiBarElement", ["root"]);
const useUtilityClasses$b = (ownerState) => {
  const {
    classes,
    id
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`]
  };
  return composeClasses(slots, getBarElementUtilityClass, classes);
};
const BarElementPath = styled(animated.rect, {
  name: "MuiBarElement",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState
}) => ({
  stroke: "none",
  shapeRendering: "crispEdges",
  fill: ownerState.isHighlighted ? color(ownerState.color).brighter(0.5).formatHex() : ownerState.color,
  transition: "opacity 0.2s ease-in, fill 0.2s ease-in",
  opacity: ownerState.isFaded && 0.3 || 1
}));
function BarElement(props) {
  var _slots$bar;
  const {
    id,
    dataIndex,
    classes: innerClasses,
    color: color2,
    highlightScope,
    slots,
    slotProps,
    style
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$j);
  const getInteractionItemProps = useInteractionItemProps(highlightScope);
  const {
    item
  } = reactExports.useContext(InteractionContext);
  const isHighlighted = getIsHighlighted(item, {
    type: "bar",
    seriesId: id,
    dataIndex
  }, highlightScope);
  const isFaded = !isHighlighted && getIsFaded(item, {
    type: "bar",
    seriesId: id,
    dataIndex
  }, highlightScope);
  const ownerState = {
    id,
    dataIndex,
    classes: innerClasses,
    color: color2,
    isFaded,
    isHighlighted
  };
  const classes = useUtilityClasses$b(ownerState);
  const Bar = (_slots$bar = slots == null ? void 0 : slots.bar) != null ? _slots$bar : BarElementPath;
  const barProps = useSlotProps({
    elementType: Bar,
    externalSlotProps: slotProps == null ? void 0 : slotProps.bar,
    additionalProps: _extends({}, other, getInteractionItemProps({
      type: "bar",
      seriesId: id,
      dataIndex
    }), {
      style,
      className: classes.root
    }),
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, _extends({}, barProps));
}
const _excluded$i = ["skipAnimation"];
function getBandSize({
  bandWidth: W,
  numberOfGroups: N,
  gapRatio: r
}) {
  if (r === 0) {
    return {
      barWidth: W / N,
      offset: 0
    };
  }
  const barWidth = W / (N + (N - 1) * r);
  const offset = r * barWidth;
  return {
    barWidth,
    offset
  };
}
const useCompletedData = () => {
  var _React$useContext$bar;
  const seriesData = (_React$useContext$bar = reactExports.useContext(SeriesContext).bar) != null ? _React$useContext$bar : {
    series: {},
    stackingGroups: []
  };
  const axisData = reactExports.useContext(CartesianContext);
  const {
    series,
    stackingGroups
  } = seriesData;
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = axisData;
  const defaultXAxisId = xAxisIds[0];
  const defaultYAxisId = yAxisIds[0];
  const data = stackingGroups.flatMap(({
    ids: groupIds
  }, groupIndex) => {
    return groupIds.flatMap((seriesId) => {
      var _series$seriesId$xAxi, _series$seriesId$yAxi;
      const xAxisKey = (_series$seriesId$xAxi = series[seriesId].xAxisKey) != null ? _series$seriesId$xAxi : defaultXAxisId;
      const yAxisKey = (_series$seriesId$yAxi = series[seriesId].yAxisKey) != null ? _series$seriesId$yAxi : defaultYAxisId;
      const xAxisConfig = xAxis[xAxisKey];
      const yAxisConfig = yAxis[yAxisKey];
      const verticalLayout = series[seriesId].layout === "vertical";
      let baseScaleConfig;
      if (verticalLayout) {
        if (!isBandScaleConfig(xAxisConfig)) {
          throw new Error(`MUI-X-Charts: ${xAxisKey === DEFAULT_X_AXIS_KEY ? "The first `xAxis`" : `The x-axis with id "${xAxisKey}"`} shoud be of type "band" to display the bar series of id "${seriesId}"`);
        }
        if (xAxis[xAxisKey].data === void 0) {
          throw new Error(`MUI-X-Charts: ${xAxisKey === DEFAULT_X_AXIS_KEY ? "The first `xAxis`" : `The x-axis with id "${xAxisKey}"`} shoud have data property`);
        }
        baseScaleConfig = xAxisConfig;
      } else {
        if (!isBandScaleConfig(yAxisConfig)) {
          throw new Error(`MUI-X-Charts: ${yAxisKey === DEFAULT_Y_AXIS_KEY ? "The first `yAxis`" : `The y-axis with id "${yAxisKey}"`} shoud be of type "band" to display the bar series of id "${seriesId}"`);
        }
        if (yAxis[yAxisKey].data === void 0) {
          throw new Error(`MUI-X-Charts: ${yAxisKey === DEFAULT_Y_AXIS_KEY ? "The first `yAxis`" : `The y-axis with id "${yAxisKey}"`} shoud have data property`);
        }
        baseScaleConfig = yAxisConfig;
      }
      const xScale = xAxisConfig.scale;
      const yScale = yAxisConfig.scale;
      const bandWidth = baseScaleConfig.scale.bandwidth();
      const {
        barWidth,
        offset
      } = getBandSize({
        bandWidth,
        numberOfGroups: stackingGroups.length,
        gapRatio: baseScaleConfig.barGapRatio
      });
      const barOffset = groupIndex * (barWidth + offset);
      const {
        stackedData,
        color: color2
      } = series[seriesId];
      return stackedData.map((values, dataIndex) => {
        var _xAxis$xAxisKey$data, _yAxis$yAxisKey$data;
        const valueCoordinates = values.map((v) => verticalLayout ? yScale(v) : xScale(v));
        const minValueCoord = Math.min(...valueCoordinates);
        const maxValueCoord = Math.max(...valueCoordinates);
        return {
          seriesId,
          dataIndex,
          layout: series[seriesId].layout,
          x: verticalLayout ? xScale((_xAxis$xAxisKey$data = xAxis[xAxisKey].data) == null ? void 0 : _xAxis$xAxisKey$data[dataIndex]) + barOffset : minValueCoord,
          y: verticalLayout ? minValueCoord : yScale((_yAxis$yAxisKey$data = yAxis[yAxisKey].data) == null ? void 0 : _yAxis$yAxisKey$data[dataIndex]) + barOffset,
          xOrigin: xScale(0),
          yOrigin: yScale(0),
          height: verticalLayout ? maxValueCoord - minValueCoord : barWidth,
          width: verticalLayout ? barWidth : maxValueCoord - minValueCoord,
          color: color2,
          highlightScope: series[seriesId].highlightScope
        };
      });
    });
  });
  return data;
};
const getOutStyle = ({
  layout,
  yOrigin,
  x: x2,
  width,
  y: y2,
  xOrigin,
  height
}) => _extends({}, layout === "vertical" ? {
  y: yOrigin,
  x: x2,
  height: 0,
  width
} : {
  y: y2,
  x: xOrigin,
  height,
  width: 0
});
const getInStyle = ({
  x: x2,
  width,
  y: y2,
  height
}) => ({
  y: y2,
  x: x2,
  height,
  width
});
function BarPlot(props) {
  const completedData = useCompletedData();
  const {
    skipAnimation
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$i);
  const transition = useTransition(completedData, {
    keys: (bar) => `${bar.seriesId}-${bar.dataIndex}`,
    from: getOutStyle,
    leave: getOutStyle,
    enter: getInStyle,
    update: getInStyle,
    immediate: skipAnimation
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, {
    children: transition((style, {
      seriesId,
      dataIndex,
      color: color2,
      highlightScope
    }) => /* @__PURE__ */ jsxRuntimeExports.jsx(BarElement, _extends({
      id: seriesId,
      dataIndex,
      highlightScope,
      color: color2
    }, other, {
      style
    })))
  });
}
const useReducedMotion = () => {
  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion)");
    const handleMediaChange = (e) => {
      globals_exports.assign({
        // Modification such the react-spring implementation such that this hook can remove animation but never activate animation.
        skipAnimation: e.matches || void 0
      });
    };
    handleMediaChange(mql);
    mql.addEventListener("change", handleMediaChange);
    return () => {
      mql.removeEventListener("change", handleMediaChange);
    };
  }, []);
};
const useAxisEvents = (disableAxisListener) => {
  const svgRef = reactExports.useContext(SVGContext);
  const {
    width,
    height,
    top,
    left
  } = reactExports.useContext(DrawingContext);
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = reactExports.useContext(CartesianContext);
  const {
    dispatch
  } = reactExports.useContext(InteractionContext);
  const usedXAxis = xAxisIds[0];
  const usedYAxis = yAxisIds[0];
  const mousePosition = reactExports.useRef({
    x: -1,
    y: -1
  });
  reactExports.useEffect(() => {
    const element = svgRef.current;
    if (element === null || disableAxisListener) {
      return () => {
      };
    }
    const getUpdate = (axisConfig, mouseValue) => {
      if (usedXAxis === null) {
        return null;
      }
      const {
        scale,
        data: axisData
      } = axisConfig;
      if (!isBandScale(scale)) {
        const value = scale.invert(mouseValue);
        if (axisData === void 0) {
          return {
            value
          };
        }
        const closestIndex = axisData == null ? void 0 : axisData.findIndex((v, index) => {
          if (v > value) {
            if (index === 0 || Math.abs(value - v) <= Math.abs(value - axisData[index - 1])) {
              return true;
            }
          }
          if (v <= value) {
            if (index === axisData.length - 1 || // @ts-ignore
            Math.abs(value - v) < Math.abs(value - axisData[index + 1])) {
              return true;
            }
          }
          return false;
        });
        return {
          value: closestIndex !== void 0 && closestIndex >= 0 ? axisData[closestIndex] : value,
          index: closestIndex
        };
      }
      const dataIndex = scale.bandwidth() === 0 ? Math.floor((mouseValue - Math.min(...scale.range()) + scale.step() / 2) / scale.step()) : Math.floor((mouseValue - Math.min(...scale.range())) / scale.step());
      if (dataIndex < 0 || dataIndex >= axisData.length) {
        return null;
      }
      return {
        index: dataIndex,
        value: axisData[dataIndex]
      };
    };
    const handleMouseOut = () => {
      mousePosition.current = {
        x: -1,
        y: -1
      };
      dispatch({
        type: "updateAxis",
        data: {
          x: null,
          y: null
        }
      });
    };
    const handleMouseMove = (event) => {
      const pt = svgRef.current.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
      mousePosition.current = {
        x: svgPt.x,
        y: svgPt.y
      };
      const outsideX = svgPt.x < left || svgPt.x > left + width;
      const outsideY = svgPt.y < top || svgPt.y > top + height;
      if (outsideX || outsideY) {
        dispatch({
          type: "updateAxis",
          data: {
            x: null,
            y: null
          }
        });
        return;
      }
      const newStateX = getUpdate(xAxis[usedXAxis], svgPt.x);
      const newStateY = getUpdate(yAxis[usedYAxis], svgPt.y);
      dispatch({
        type: "updateAxis",
        data: {
          x: newStateX,
          y: newStateY
        }
      });
    };
    element.addEventListener("mouseout", handleMouseOut);
    element.addEventListener("mousemove", handleMouseMove);
    return () => {
      element.removeEventListener("mouseout", handleMouseOut);
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, [svgRef, dispatch, left, width, top, height, usedYAxis, yAxis, usedXAxis, xAxis, disableAxisListener]);
};
const _excluded$h = ["children", "width", "height", "viewBox", "disableAxisListener", "className"];
const ChartChartsSurfaceStyles = styled("svg", {
  name: "MuiChartsSurface",
  slot: "Root"
})(() => ({}));
const ChartsSurface = /* @__PURE__ */ reactExports.forwardRef(function ChartsSurface2(props, ref) {
  const {
    children,
    width,
    height,
    viewBox,
    disableAxisListener = false
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$h);
  const svgView = _extends({
    width,
    height,
    x: 0,
    y: 0
  }, viewBox);
  useAxisEvents(disableAxisListener);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ChartChartsSurfaceStyles, _extends({
    width,
    height,
    viewBox: `${svgView.x} ${svgView.y} ${svgView.width} ${svgView.height}`,
    ref
  }, other, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("title", {
      children: props.title
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("desc", {
      children: props.desc
    }), children]
  }));
});
const ChartContainer = /* @__PURE__ */ reactExports.forwardRef(function ChartContainer2(props, ref) {
  const {
    width,
    height,
    series,
    margin,
    xAxis,
    yAxis,
    colors,
    dataset,
    sx,
    title,
    desc,
    disableAxisListener,
    children
  } = props;
  const svgRef = reactExports.useRef(null);
  const handleRef = useForkRef(ref, svgRef);
  useReducedMotion();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DrawingProvider, {
    width,
    height,
    margin,
    svgRef,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SeriesContextProvider, {
      series,
      colors,
      dataset,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianContextProvider, {
        xAxis,
        yAxis,
        dataset,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(InteractionProvider, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightProvider, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsSurface, {
              width,
              height,
              ref: handleRef,
              sx,
              title,
              desc,
              disableAxisListener,
              children
            })
          })
        })
      })
    })
  });
});
const _excluded$g = ["width", "height"];
const useChartDimensions = (inWidth, inHeight) => {
  const rootRef = reactExports.useRef(null);
  const displayError = reactExports.useRef(false);
  const [width, setWidth] = reactExports.useState(0);
  const [height, setHeight] = reactExports.useState(0);
  const computeSize = reactExports.useCallback(() => {
    const mainEl = rootRef == null ? void 0 : rootRef.current;
    if (!mainEl) {
      return;
    }
    const win = ownerWindow(mainEl);
    const computedStyle = win.getComputedStyle(mainEl);
    const newHeight = Math.floor(parseFloat(computedStyle.height)) || 0;
    const newWidth = Math.floor(parseFloat(computedStyle.width)) || 0;
    setWidth(newWidth);
    setHeight(newHeight);
  }, []);
  reactExports.useEffect(() => {
    displayError.current = true;
  }, []);
  useEnhancedEffect(() => {
    if (inWidth !== void 0 && inHeight !== void 0) {
      return () => {
      };
    }
    computeSize();
    const elementToObserve = rootRef.current;
    if (typeof ResizeObserver === "undefined") {
      return () => {
      };
    }
    let animationFrame;
    const observer = new ResizeObserver(() => {
      animationFrame = requestAnimationFrame(() => {
        computeSize();
      });
    });
    if (elementToObserve) {
      observer.observe(elementToObserve);
    }
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      if (elementToObserve) {
        observer.unobserve(elementToObserve);
      }
    };
  }, [computeSize, inHeight, inWidth]);
  return [rootRef, inWidth != null ? inWidth : width, inHeight != null ? inHeight : height];
};
const ResizableContainer = styled("div", {
  name: "MuiResponsiveChart",
  slot: "Container"
})(({
  ownerState
}) => {
  var _ownerState$width, _ownerState$height;
  return {
    width: (_ownerState$width = ownerState.width) != null ? _ownerState$width : "100%",
    height: (_ownerState$height = ownerState.height) != null ? _ownerState$height : "100%",
    display: "flex",
    position: "relative",
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    "&>svg": {
      width: "100%",
      height: "100%"
    }
  };
});
const ResponsiveChartContainer = /* @__PURE__ */ reactExports.forwardRef(function ResponsiveChartContainer2(props, ref) {
  const {
    width: inWidth,
    height: inHeight
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$g);
  const [containerRef, width, height] = useChartDimensions(inWidth, inHeight);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ResizableContainer, {
    ref: containerRef,
    ownerState: {
      width: inWidth,
      height: inHeight
    },
    children: width && height ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, _extends({}, other, {
      width,
      height,
      ref
    })) : null
  });
});
function getAxisUtilityClass(slot) {
  return generateUtilityClass("MuiChartsAxis", slot);
}
const axisClasses = generateUtilityClasses("MuiChartsAxis", ["root", "line", "tickContainer", "tick", "tickLabel", "label", "directionX", "directionY", "top", "bottom", "left", "right"]);
const AxisRoot = styled("g", {
  name: "MuiChartsAxis",
  slot: "Root",
  overridesResolver: (props, styles) => styles.root
})(({
  theme
}) => ({
  [`& .${axisClasses.tickLabel}`]: _extends({}, theme.typography.caption, {
    fill: (theme.vars || theme).palette.text.primary
  }),
  [`& .${axisClasses.label}`]: _extends({}, theme.typography.body1, {
    fill: (theme.vars || theme).palette.text.primary
  }),
  [`& .${axisClasses.line}`]: {
    stroke: (theme.vars || theme).palette.text.primary,
    shapeRendering: "crispEdges",
    strokeWidth: 1
  },
  [`& .${axisClasses.tick}`]: {
    stroke: (theme.vars || theme).palette.text.primary,
    shapeRendering: "crispEdges"
  }
}));
const isSsr = () => !(typeof window !== "undefined" && window.document && window.setTimeout);
const stringCache = {
  widthCache: {},
  cacheCount: 0
};
const MAX_CACHE_NUM = 2e3;
const SPAN_STYLE = {
  position: "absolute",
  top: "-20000px",
  left: 0,
  padding: 0,
  margin: 0,
  border: "none",
  whiteSpace: "pre"
};
const STYLE_LIST = ["minWidth", "maxWidth", "width", "minHeight", "maxHeight", "height", "top", "left", "fontSize", "padding", "margin", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "marginLeft", "marginRight", "marginTop", "marginBottom"];
const MEASUREMENT_SPAN_ID = "mui_measurement_span";
function autoCompleteStyle(name, value) {
  if (STYLE_LIST.indexOf(name) >= 0 && value === +value) {
    return `${value}px`;
  }
  return value;
}
function camelToMiddleLine(text) {
  const strs = text.split("");
  const formatStrs = strs.reduce((result, entry) => {
    if (entry === entry.toUpperCase()) {
      return [...result, "-", entry.toLowerCase()];
    }
    return [...result, entry];
  }, []);
  return formatStrs.join("");
}
const getStyleString = (style) => Object.keys(style).sort().reduce((result, s2) => `${result}${camelToMiddleLine(s2)}:${autoCompleteStyle(s2, style[s2])};`, "");
const getStringSize = (text, style = {}) => {
  if (text === void 0 || text === null || isSsr()) {
    return {
      width: 0,
      height: 0
    };
  }
  const str = `${text}`;
  const styleString = getStyleString(style);
  const cacheKey = `${str}-${styleString}`;
  if (stringCache.widthCache[cacheKey]) {
    return stringCache.widthCache[cacheKey];
  }
  try {
    let measurementSpan = document.getElementById(MEASUREMENT_SPAN_ID);
    if (measurementSpan === null) {
      measurementSpan = document.createElement("span");
      measurementSpan.setAttribute("id", MEASUREMENT_SPAN_ID);
      measurementSpan.setAttribute("aria-hidden", "true");
      document.body.appendChild(measurementSpan);
    }
    const measurementSpanStyle = _extends({}, SPAN_STYLE, style);
    Object.keys(measurementSpanStyle).map((styleKey) => {
      measurementSpan.style[camelToMiddleLine(styleKey)] = autoCompleteStyle(styleKey, measurementSpanStyle[styleKey]);
      return styleKey;
    });
    measurementSpan.textContent = str;
    const rect = measurementSpan.getBoundingClientRect();
    const result = {
      width: rect.width,
      height: rect.height
    };
    stringCache.widthCache[cacheKey] = result;
    if (stringCache.cacheCount + 1 > MAX_CACHE_NUM) {
      stringCache.cacheCount = 0;
      stringCache.widthCache = {};
    } else {
      stringCache.cacheCount += 1;
    }
    return result;
  } catch (e) {
    return {
      width: 0,
      height: 0
    };
  }
};
function getWordsByLines({
  style,
  needsComputation,
  text
}) {
  return text.split("\n").map((subText) => _extends({
    text: subText
  }, needsComputation ? getStringSize(subText, style) : {
    width: 0,
    height: 0
  }));
}
const _excluded$f = ["x", "y", "style", "text", "ownerState"], _excluded2$3 = ["angle", "textAnchor", "dominantBaseline"];
function ChartsText(props) {
  const {
    x: x2,
    y: y2,
    style: styleProps,
    text
  } = props, textProps = _objectWithoutPropertiesLoose(props, _excluded$f);
  const _ref = styleProps != null ? styleProps : {}, {
    angle,
    textAnchor,
    dominantBaseline
  } = _ref, style = _objectWithoutPropertiesLoose(_ref, _excluded2$3);
  const wordsByLines = reactExports.useMemo(() => getWordsByLines({
    style,
    needsComputation: text.includes("\n"),
    text
  }), [style, text]);
  let startDy;
  switch (dominantBaseline) {
    case "hanging":
      startDy = 0;
      break;
    case "central":
      startDy = (wordsByLines.length - 1) / 2 * -wordsByLines[0].height;
      break;
    default:
      startDy = (wordsByLines.length - 1) * -wordsByLines[0].height;
      break;
  }
  const transforms = [];
  if (angle) {
    transforms.push(`rotate(${angle}, ${x2}, ${y2})`);
  }
  if (transforms.length) {
    textProps.transform = transforms.join(" ");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("text", _extends({}, textProps, {
    x: x2,
    y: y2,
    textAnchor,
    dominantBaseline,
    style,
    children: wordsByLines.map((line, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("tspan", {
      x: x2,
      dy: `${index === 0 ? startDy : wordsByLines[0].height}px`,
      dominantBaseline,
      children: line.text
    }, index))
  }));
}
const ANGLE_APPROX = 5;
function getMinXTranslation(width, height, angle = 0) {
  const standardAngle = Math.min(Math.abs(angle) % 180, Math.abs(Math.abs(angle) % 180 - 180) % 180);
  if (standardAngle < ANGLE_APPROX) {
    return width;
  }
  if (standardAngle > 90 - ANGLE_APPROX) {
    return height;
  }
  const radAngle = standardAngle * Math.PI / 180;
  const angleSwich = Math.atan2(height, width);
  if (radAngle < angleSwich) {
    return width / Math.cos(radAngle);
  }
  return height / Math.sin(radAngle);
}
function useMounted(defer = false) {
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
  return mountedState;
}
const _excluded$e = ["scale", "tickNumber", "reverse"];
const useUtilityClasses$a = (ownerState) => {
  const {
    classes,
    position
  } = ownerState;
  const slots = {
    root: ["root", "directionX", position],
    line: ["line"],
    tickContainer: ["tickContainer"],
    tick: ["tick"],
    tickLabel: ["tickLabel"],
    label: ["label"]
  };
  return composeClasses(slots, getAxisUtilityClass, classes);
};
function addLabelDimension(xTicks, {
  tickLabelStyle: style,
  tickLabelInterval,
  reverse,
  isMounted
}) {
  const withDimension = xTicks.map((tick) => {
    if (!isMounted || tick.formattedValue === void 0) {
      return _extends({}, tick, {
        width: 0,
        height: 0
      });
    }
    const tickSizes = getWordsByLines({
      style,
      needsComputation: true,
      text: tick.formattedValue
    });
    return _extends({}, tick, {
      width: Math.max(...tickSizes.map((size) => size.width)),
      height: Math.max(tickSizes.length * tickSizes[0].height)
    });
  });
  if (typeof tickLabelInterval === "function") {
    return withDimension.map((item, index) => _extends({}, item, {
      skipLabel: !tickLabelInterval(item.value, index)
    }));
  }
  let currentTextLimit = 0;
  let previouseTextLimit = 0;
  const direction = reverse ? -1 : 1;
  return withDimension.map((item, labelIndex) => {
    const {
      width,
      offset,
      labelOffset,
      height
    } = item;
    const distance = getMinXTranslation(width, height, style == null ? void 0 : style.angle);
    const textPosition = offset + labelOffset;
    const gapRatio = 1.2;
    currentTextLimit = textPosition - direction * (gapRatio * distance) / 2;
    if (labelIndex > 0 && direction * currentTextLimit < direction * previouseTextLimit) {
      return _extends({}, item, {
        skipLabel: true
      });
    }
    previouseTextLimit = textPosition + direction * (gapRatio * distance) / 2;
    return item;
  });
}
const defaultProps$2 = {
  position: "bottom",
  disableLine: false,
  disableTicks: false,
  tickSize: 6
};
function ChartsXAxis(inProps) {
  var _props$axisId, _slots$axisLine, _slots$axisTick, _slots$axisTickLabel, _slots$axisLabel;
  const props = useThemeProps({
    props: _extends({}, defaultProps$2, inProps),
    name: "MuiChartsXAxis"
  });
  const {
    xAxisIds
  } = reactExports.useContext(CartesianContext);
  const _React$useContext = reactExports.useContext(CartesianContext), _ref = (_props$axisId = props.axisId) != null ? _props$axisId : xAxisIds[0], {
    xAxis: {
      [_ref]: {
        scale: xScale,
        tickNumber,
        reverse
      }
    }
  } = _React$useContext, settings = _objectWithoutPropertiesLoose(_React$useContext.xAxis[_ref], _excluded$e);
  const isMounted = useMounted();
  const defaultizedProps = _extends({}, defaultProps$2, settings, props);
  const {
    position,
    disableLine,
    disableTicks,
    tickLabelStyle,
    label,
    labelStyle,
    tickFontSize,
    labelFontSize,
    tickSize: tickSizeProp,
    valueFormatter,
    slots,
    slotProps,
    tickInterval,
    tickLabelInterval
  } = defaultizedProps;
  const theme = useTheme();
  const classes = useUtilityClasses$a(_extends({}, defaultizedProps, {
    theme
  }));
  const {
    left,
    top,
    width,
    height
  } = reactExports.useContext(DrawingContext);
  const tickSize = disableTicks ? 4 : tickSizeProp;
  const positionSign = position === "bottom" ? 1 : -1;
  const Line = (_slots$axisLine = slots == null ? void 0 : slots.axisLine) != null ? _slots$axisLine : "line";
  const Tick = (_slots$axisTick = slots == null ? void 0 : slots.axisTick) != null ? _slots$axisTick : "line";
  const TickLabel = (_slots$axisTickLabel = slots == null ? void 0 : slots.axisTickLabel) != null ? _slots$axisTickLabel : ChartsText;
  const Label = (_slots$axisLabel = slots == null ? void 0 : slots.axisLabel) != null ? _slots$axisLabel : ChartsText;
  const axisTickLabelProps = useSlotProps({
    elementType: TickLabel,
    externalSlotProps: slotProps == null ? void 0 : slotProps.axisTickLabel,
    additionalProps: {
      style: _extends({
        textAnchor: "middle",
        dominantBaseline: position === "bottom" ? "hanging" : "auto",
        fontSize: tickFontSize != null ? tickFontSize : 12
      }, tickLabelStyle),
      className: classes.tickLabel
    },
    className: classes.tickLabel,
    ownerState: {}
  });
  const xTicks = useTicks({
    scale: xScale,
    tickNumber,
    valueFormatter,
    tickInterval
  });
  const xTicksWithDimension = addLabelDimension(xTicks, {
    tickLabelStyle: axisTickLabelProps.style,
    tickLabelInterval,
    reverse,
    isMounted
  });
  const labelRefPoint = {
    x: left + width / 2,
    y: positionSign * (tickSize + 22)
  };
  const axisLabelProps = useSlotProps({
    elementType: Label,
    externalSlotProps: slotProps == null ? void 0 : slotProps.axisLabel,
    additionalProps: {
      style: _extends({
        fontSize: labelFontSize != null ? labelFontSize : 14,
        textAnchor: "middle",
        dominantBaseline: position === "bottom" ? "hanging" : "auto"
      }, labelStyle)
    },
    ownerState: {}
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AxisRoot, {
    transform: `translate(0, ${position === "bottom" ? top + height : top})`,
    className: classes.root,
    children: [!disableLine && /* @__PURE__ */ jsxRuntimeExports.jsx(Line, _extends({
      x1: xScale.range()[0],
      x2: xScale.range()[1],
      className: classes.line
    }, slotProps == null ? void 0 : slotProps.axisLine)), xTicksWithDimension.map(({
      formattedValue,
      offset,
      labelOffset,
      skipLabel
    }, index) => {
      const xTickLabel = labelOffset != null ? labelOffset : 0;
      const yTickLabel = positionSign * (tickSize + 3);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
        transform: `translate(${offset}, 0)`,
        className: classes.tickContainer,
        children: [!disableTicks && /* @__PURE__ */ jsxRuntimeExports.jsx(Tick, _extends({
          y2: positionSign * tickSize,
          className: classes.tick
        }, slotProps == null ? void 0 : slotProps.axisTick)), formattedValue !== void 0 && !skipLabel && /* @__PURE__ */ jsxRuntimeExports.jsx(TickLabel, _extends({
          x: xTickLabel,
          y: yTickLabel
        }, axisTickLabelProps, {
          text: formattedValue.toString()
        }))]
      }, index);
    }), label && /* @__PURE__ */ jsxRuntimeExports.jsx("g", {
      className: classes.label,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Label, _extends({}, labelRefPoint, axisLabelProps, {
        text: label
      }))
    })]
  });
}
const _excluded$d = ["scale", "tickNumber"];
const useUtilityClasses$9 = (ownerState) => {
  const {
    classes,
    position
  } = ownerState;
  const slots = {
    root: ["root", "directionY", position],
    line: ["line"],
    tickContainer: ["tickContainer"],
    tick: ["tick"],
    tickLabel: ["tickLabel"],
    label: ["label"]
  };
  return composeClasses(slots, getAxisUtilityClass, classes);
};
const defaultProps$1 = {
  position: "left",
  disableLine: false,
  disableTicks: false,
  tickFontSize: 12,
  labelFontSize: 14,
  tickSize: 6
};
function ChartsYAxis(inProps) {
  var _props$axisId, _slots$axisLine, _slots$axisTick, _slots$axisTickLabel, _slots$axisLabel;
  const props = useThemeProps({
    props: _extends({}, defaultProps$1, inProps),
    name: "MuiChartsYAxis"
  });
  const {
    yAxisIds
  } = reactExports.useContext(CartesianContext);
  const _React$useContext = reactExports.useContext(CartesianContext), _ref = (_props$axisId = props.axisId) != null ? _props$axisId : yAxisIds[0], {
    yAxis: {
      [_ref]: {
        scale: yScale,
        tickNumber
      }
    }
  } = _React$useContext, settings = _objectWithoutPropertiesLoose(_React$useContext.yAxis[_ref], _excluded$d);
  const defaultizedProps = _extends({}, defaultProps$1, settings, props);
  const {
    position,
    disableLine,
    disableTicks,
    tickFontSize,
    label,
    labelFontSize,
    labelStyle,
    tickLabelStyle,
    tickSize: tickSizeProp,
    valueFormatter,
    slots,
    slotProps
  } = defaultizedProps;
  const theme = useTheme();
  const classes = useUtilityClasses$9(_extends({}, defaultizedProps, {
    theme
  }));
  const {
    left,
    top,
    width,
    height
  } = reactExports.useContext(DrawingContext);
  const tickSize = disableTicks ? 4 : tickSizeProp;
  const yTicks = useTicks({
    scale: yScale,
    tickNumber,
    valueFormatter
  });
  const positionSign = position === "right" ? 1 : -1;
  const labelRefPoint = {
    x: positionSign * (tickFontSize + tickSize + 10),
    y: top + height / 2
  };
  const Line = (_slots$axisLine = slots == null ? void 0 : slots.axisLine) != null ? _slots$axisLine : "line";
  const Tick = (_slots$axisTick = slots == null ? void 0 : slots.axisTick) != null ? _slots$axisTick : "line";
  const TickLabel = (_slots$axisTickLabel = slots == null ? void 0 : slots.axisTickLabel) != null ? _slots$axisTickLabel : ChartsText;
  const Label = (_slots$axisLabel = slots == null ? void 0 : slots.axisLabel) != null ? _slots$axisLabel : ChartsText;
  const axisTickLabelProps = useSlotProps({
    elementType: TickLabel,
    externalSlotProps: slotProps == null ? void 0 : slotProps.axisTickLabel,
    additionalProps: {
      style: _extends({
        fontSize: tickFontSize,
        textAnchor: position === "right" ? "start" : "end",
        dominantBaseline: "central"
      }, tickLabelStyle),
      className: classes.tickLabel
    },
    ownerState: {}
  });
  const axisLabelProps = useSlotProps({
    elementType: Label,
    externalSlotProps: slotProps == null ? void 0 : slotProps.axisLabel,
    additionalProps: {
      style: _extends({
        fontSize: labelFontSize,
        angle: positionSign * 90,
        textAnchor: "middle",
        dominantBaseline: "auto"
      }, labelStyle)
    },
    ownerState: {}
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AxisRoot, {
    transform: `translate(${position === "right" ? left + width : left}, 0)`,
    className: classes.root,
    children: [!disableLine && /* @__PURE__ */ jsxRuntimeExports.jsx(Line, _extends({
      y1: yScale.range()[0],
      y2: yScale.range()[1],
      className: classes.line
    }, slotProps == null ? void 0 : slotProps.axisLine)), yTicks.map(({
      formattedValue,
      offset,
      labelOffset
    }, index) => {
      const xTickLabel = positionSign * (tickSize + 2);
      const yTickLabel = labelOffset;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
        transform: `translate(0, ${offset})`,
        className: classes.tickContainer,
        children: [!disableTicks && /* @__PURE__ */ jsxRuntimeExports.jsx(Tick, _extends({
          x2: positionSign * tickSize,
          className: classes.tick
        }, slotProps == null ? void 0 : slotProps.axisTick)), formattedValue !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TickLabel, _extends({
          x: xTickLabel,
          y: yTickLabel,
          text: formattedValue.toString()
        }, axisTickLabelProps))]
      }, index);
    }), label && /* @__PURE__ */ jsxRuntimeExports.jsx("g", {
      className: classes.label,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Label, _extends({}, labelRefPoint, axisLabelProps, {
        text: label
      }))
    })]
  });
}
const getAxisId = (propsValue) => {
  if (propsValue == null) {
    return null;
  }
  if (typeof propsValue === "object") {
    var _propsValue$axisId;
    return (_propsValue$axisId = propsValue.axisId) != null ? _propsValue$axisId : null;
  }
  return propsValue;
};
const mergeProps = (axisConfig, slots, slotProps) => {
  return typeof axisConfig === "object" ? _extends({}, axisConfig, {
    slots: _extends({}, slots, axisConfig == null ? void 0 : axisConfig.slots),
    slotProps: _extends({}, slotProps, axisConfig == null ? void 0 : axisConfig.slotProps)
  }) : {
    slots,
    slotProps
  };
};
function ChartsAxis(props) {
  const {
    topAxis,
    leftAxis,
    rightAxis,
    bottomAxis,
    slots,
    slotProps
  } = props;
  const {
    xAxis,
    xAxisIds,
    yAxis,
    yAxisIds
  } = reactExports.useContext(CartesianContext);
  const leftId = getAxisId(leftAxis === void 0 ? yAxisIds[0] : leftAxis);
  const bottomId = getAxisId(bottomAxis === void 0 ? xAxisIds[0] : bottomAxis);
  const topId = getAxisId(topAxis);
  const rightId = getAxisId(rightAxis);
  if (topId !== null && !xAxis[topId]) {
    throw Error([`MUI-X-Charts: id used for top axis "${topId}" is not defined.`, `Available ids are: ${xAxisIds.join(", ")}.`].join("\n"));
  }
  if (leftId !== null && !yAxis[leftId]) {
    throw Error([`MUI-X-Charts: id used for left axis "${leftId}" is not defined.`, `Available ids are: ${yAxisIds.join(", ")}.`].join("\n"));
  }
  if (rightId !== null && !yAxis[rightId]) {
    throw Error([`MUI-X-Charts: id used for right axis "${rightId}" is not defined.`, `Available ids are: ${yAxisIds.join(", ")}.`].join("\n"));
  }
  if (bottomId !== null && !xAxis[bottomId]) {
    throw Error([`MUI-X-Charts: id used for bottom axis "${bottomId}" is not defined.`, `Available ids are: ${xAxisIds.join(", ")}.`].join("\n"));
  }
  const topAxisProps = mergeProps(topAxis, slots, slotProps);
  const bottomAxisProps = mergeProps(bottomAxis, slots, slotProps);
  const leftAxisProps = mergeProps(leftAxis, slots, slotProps);
  const rightAxisProps = mergeProps(rightAxis, slots, slotProps);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [topId && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsXAxis, _extends({}, topAxisProps, {
      position: "top",
      axisId: topId
    })), bottomId && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsXAxis, _extends({}, bottomAxisProps, {
      position: "bottom",
      axisId: bottomId
    })), leftId && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsYAxis, _extends({}, leftAxisProps, {
      position: "left",
      axisId: leftId
    })), rightId && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsYAxis, _extends({}, rightAxisProps, {
      position: "right",
      axisId: rightId
    }))]
  });
}
function generateVirtualElement(mousePosition) {
  if (mousePosition === null) {
    return {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ""
      })
    };
  }
  const {
    x: x2,
    y: y2
  } = mousePosition;
  return {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      x: x2,
      y: y2,
      top: y2,
      right: x2,
      bottom: y2,
      left: x2,
      toJSON: () => JSON.stringify({
        width: 0,
        height: 0,
        x: x2,
        y: y2,
        top: y2,
        right: x2,
        bottom: y2,
        left: x2
      })
    })
  };
}
function useMouseTracker() {
  const svgRef = reactExports.useContext(SVGContext);
  const [mousePosition, setMousePosition] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const element = svgRef.current;
    if (element === null) {
      return () => {
      };
    }
    const handleMouseOut = () => {
      setMousePosition(null);
    };
    const handleMouseMove = (event) => {
      setMousePosition({
        x: event.clientX,
        y: event.clientY
      });
    };
    element.addEventListener("mouseout", handleMouseOut);
    element.addEventListener("mousemove", handleMouseMove);
    return () => {
      element.removeEventListener("mouseout", handleMouseOut);
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, [svgRef]);
  return mousePosition;
}
function getTooltipHasData(trigger, displayedData) {
  if (trigger === "item") {
    return displayedData !== null;
  }
  const hasAxisXData = displayedData.x !== null;
  const hasAxisYData = displayedData.y !== null;
  return hasAxisXData || hasAxisYData;
}
function getChartsTooltipUtilityClass(slot) {
  return generateUtilityClass("MuiChartsTooltip", slot);
}
const chartsTooltipClasses = generateUtilityClasses("MuiChartsTooltip", ["root", "table", "row", "cell", "mark", "markCell", "labelCell", "valueCell"]);
const ChartsTooltipPaper = styled("div", {
  name: "MuiChartsTooltip",
  slot: "Container"
})(({
  theme
}) => ({
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.primary,
  transition: theme.transitions.create("box-shadow"),
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
  borderRadius: theme.shape.borderRadius
}));
const ChartsTooltipTable = styled("table", {
  name: "MuiChartsTooltip",
  slot: "Table"
})(({
  theme
}) => ({
  borderSpacing: 0,
  "& thead td": {
    borderBottom: `solid ${(theme.vars || theme).palette.divider} 1px`
  }
}));
const ChartsTooltipRow = styled("tr", {
  name: "MuiChartsTooltip",
  slot: "Row"
})(({
  theme
}) => ({
  "tr:first-of-type& td": {
    paddingTop: theme.spacing(1)
  },
  "tr:last-of-type& td": {
    paddingBottom: theme.spacing(1)
  }
}));
const ChartsTooltipCell = styled("td", {
  name: "MuiChartsTooltip",
  slot: "Cell"
})(({
  theme
}) => ({
  verticalAlign: "middle",
  color: (theme.vars || theme).palette.text.secondary,
  [`&.${chartsTooltipClasses.labelCell}`]: {
    paddingLeft: theme.spacing(1)
  },
  [`&.${chartsTooltipClasses.valueCell}`]: {
    paddingLeft: theme.spacing(4),
    color: (theme.vars || theme).palette.text.primary
  },
  "td:first-of-type&": {
    paddingLeft: theme.spacing(2)
  },
  "td:last-of-type&": {
    paddingRight: theme.spacing(2)
  }
}));
const ChartsTooltipMark = styled(Box, {
  name: "MuiChartsTooltip",
  slot: "Mark"
})(({
  theme,
  ownerState
}) => ({
  width: theme.spacing(1),
  height: theme.spacing(1),
  borderRadius: "50%",
  backgroundColor: ownerState.color,
  borderColor: (theme.vars || theme).palette.background.paper,
  border: `solid ${(theme.vars || theme).palette.background.paper} ${theme.spacing(0.25)}`,
  boxSizing: "content-box"
}));
function DefaultChartsItemTooltipContent(props) {
  const {
    series,
    itemData,
    sx,
    classes
  } = props;
  if (itemData.dataIndex === void 0) {
    return null;
  }
  const {
    displayedLabel,
    color: color2
  } = series.type === "pie" ? {
    color: series.data[itemData.dataIndex].color,
    displayedLabel: series.data[itemData.dataIndex].label
  } : {
    color: series.color,
    displayedLabel: series.label
  };
  const formattedValue = series.valueFormatter(series.data[itemData.dataIndex]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipPaper, {
    sx,
    className: classes.root,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipTable, {
      className: classes.table,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ChartsTooltipRow, {
          className: classes.row,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
            className: clsx(classes.markCell, classes.cell),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipMark, {
              ownerState: {
                color: color2
              },
              className: classes.mark
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
            className: clsx(classes.labelCell, classes.cell),
            children: displayedLabel
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
            className: clsx(classes.valueCell, classes.cell),
            children: formattedValue
          })]
        })
      })
    })
  });
}
function ChartsItemTooltipContent(props) {
  const {
    content,
    itemData,
    sx,
    classes,
    contentProps
  } = props;
  const series = reactExports.useContext(SeriesContext)[itemData.type].series[itemData.seriesId];
  const Content = content != null ? content : DefaultChartsItemTooltipContent;
  const chartTooltipContentProps = useSlotProps({
    elementType: Content,
    externalSlotProps: contentProps,
    additionalProps: {
      itemData,
      series,
      sx,
      classes
    },
    ownerState: {}
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Content, _extends({}, chartTooltipContentProps));
}
function DefaultChartsAxisTooltipContent(props) {
  var _axis$valueFormatter;
  const {
    series,
    axis,
    dataIndex,
    axisValue,
    sx,
    classes
  } = props;
  if (dataIndex == null) {
    return null;
  }
  const axisFormatter = (_axis$valueFormatter = axis.valueFormatter) != null ? _axis$valueFormatter : (v) => v.toLocaleString();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipPaper, {
    sx,
    className: classes.root,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ChartsTooltipTable, {
      className: classes.table,
      children: [axisValue != null && !axis.hideTooltip && /* @__PURE__ */ jsxRuntimeExports.jsx("thead", {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipRow, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
            colSpan: 3,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, {
              children: axisFormatter(axisValue)
            })
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", {
        children: series.map(({
          color: color2,
          id,
          label,
          valueFormatter,
          data
        }) => {
          const formattedValue = valueFormatter(data[dataIndex]);
          if (formattedValue == null) {
            return null;
          }
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(ChartsTooltipRow, {
            className: classes.row,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
              className: clsx(classes.markCell, classes.cell),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipMark, {
                ownerState: {
                  color: color2
                },
                boxShadow: 1,
                className: classes.mark
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
              className: clsx(classes.labelCell, classes.cell),
              children: label ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, {
                children: label
              }) : null
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltipCell, {
              className: clsx(classes.valueCell, classes.cell),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, {
                children: formattedValue
              })
            })]
          }, id);
        })
      })]
    })
  });
}
function ChartsAxisTooltipContent(props) {
  const {
    content,
    contentProps,
    axisData,
    sx,
    classes
  } = props;
  const isXaxis = (axisData.x && axisData.x.index) !== void 0;
  const dataIndex = isXaxis ? axisData.x && axisData.x.index : axisData.y && axisData.y.index;
  const axisValue = isXaxis ? axisData.x && axisData.x.value : axisData.y && axisData.y.value;
  const {
    xAxisIds,
    xAxis,
    yAxisIds,
    yAxis
  } = reactExports.useContext(CartesianContext);
  const series = reactExports.useContext(SeriesContext);
  const USED_AXIS_ID = isXaxis ? xAxisIds[0] : yAxisIds[0];
  const relevantSeries = reactExports.useMemo(() => {
    const rep = [];
    Object.keys(series).filter((seriesType) => ["bar", "line", "scatter"].includes(seriesType)).forEach((seriesType) => {
      series[seriesType].seriesOrder.forEach((seriesId) => {
        const item = series[seriesType].series[seriesId];
        const axisKey = isXaxis ? item.xAxisKey : item.yAxisKey;
        if (axisKey === void 0 || axisKey === USED_AXIS_ID) {
          rep.push(series[seriesType].series[seriesId]);
        }
      });
    });
    return rep;
  }, [USED_AXIS_ID, isXaxis, series]);
  const relevantAxis = reactExports.useMemo(() => {
    return isXaxis ? xAxis[USED_AXIS_ID] : yAxis[USED_AXIS_ID];
  }, [USED_AXIS_ID, isXaxis, xAxis, yAxis]);
  const Content = content != null ? content : DefaultChartsAxisTooltipContent;
  const chartTooltipContentProps = useSlotProps({
    elementType: Content,
    externalSlotProps: contentProps,
    additionalProps: {
      axisData,
      series: relevantSeries,
      axis: relevantAxis,
      dataIndex,
      axisValue,
      sx,
      classes
    },
    ownerState: {}
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Content, _extends({}, chartTooltipContentProps));
}
const useUtilityClasses$8 = (ownerState) => {
  const {
    classes
  } = ownerState;
  const slots = {
    root: ["root"],
    table: ["table"],
    row: ["row"],
    cell: ["cell"],
    mark: ["mark"],
    markCell: ["markCell"],
    labelCell: ["labelCell"],
    valueCell: ["valueCell"]
  };
  return composeClasses(slots, getChartsTooltipUtilityClass, classes);
};
const ChartsTooltipRoot = styled(Popper, {
  name: "MuiChartsTooltip",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  theme
}) => ({
  pointerEvents: "none",
  zIndex: theme.zIndex.modal
}));
function ChartsTooltip(props) {
  var _slots$popper, _slots$itemContent, _slots$axisContent;
  const themeProps = useThemeProps({
    props,
    name: "MuiChartsTooltip"
  });
  const {
    trigger = "axis",
    itemContent,
    axisContent,
    slots,
    slotProps
  } = themeProps;
  const mousePosition = useMouseTracker();
  const {
    item,
    axis
  } = reactExports.useContext(InteractionContext);
  const displayedData = trigger === "item" ? item : axis;
  const tooltipHasData = getTooltipHasData(trigger, displayedData);
  const popperOpen = mousePosition !== null && tooltipHasData;
  const classes = useUtilityClasses$8({
    classes: themeProps.classes
  });
  const PopperComponent = (_slots$popper = slots == null ? void 0 : slots.popper) != null ? _slots$popper : ChartsTooltipRoot;
  const popperProps = useSlotProps({
    elementType: PopperComponent,
    externalSlotProps: slotProps == null ? void 0 : slotProps.popper,
    additionalProps: {
      open: popperOpen,
      placement: "right-start",
      anchorEl: generateVirtualElement(mousePosition)
    },
    ownerState: {}
  });
  if (trigger === "none") {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(NoSsr, {
    children: popperOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(PopperComponent, _extends({}, popperProps, {
      children: trigger === "item" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsItemTooltipContent, {
        itemData: displayedData,
        content: (_slots$itemContent = slots == null ? void 0 : slots.itemContent) != null ? _slots$itemContent : itemContent,
        contentProps: slotProps == null ? void 0 : slotProps.itemContent,
        sx: {
          mx: 2
        },
        classes
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisTooltipContent, {
        axisData: displayedData,
        content: (_slots$axisContent = slots == null ? void 0 : slots.axisContent) != null ? _slots$axisContent : axisContent,
        contentProps: slotProps == null ? void 0 : slotProps.axisContent,
        sx: {
          mx: 2
        },
        classes
      })
    }))
  });
}
const legendGetter$4 = (params) => {
  const {
    seriesOrder,
    series
  } = params;
  const data = seriesOrder.map((seriesId) => ({
    color: series[seriesId].color,
    label: series[seriesId].label,
    id: seriesId
  }));
  return data.filter((item) => item.label !== void 0);
};
const legendGetter$3 = (params) => {
  const {
    seriesOrder,
    series
  } = params;
  const data = seriesOrder.map((seriesId) => ({
    color: series[seriesId].color,
    label: series[seriesId].label,
    id: seriesId
  }));
  return data.filter((item) => item.label !== void 0);
};
const legendGetter$2 = (params) => {
  const {
    seriesOrder,
    series
  } = params;
  const data = seriesOrder.map((seriesId) => ({
    color: series[seriesId].color,
    label: series[seriesId].label,
    id: seriesId
  }));
  return data.filter((item) => item.label !== void 0);
};
const legendGetter$1 = (params) => {
  const {
    seriesOrder,
    series
  } = params;
  return seriesOrder.flatMap((seriesId) => series[seriesId].data.map((item) => ({
    color: item.color,
    label: item.label,
    id: item.id
  })).filter((item) => item.label !== void 0));
};
const legendGetter = {
  bar: legendGetter$4,
  scatter: legendGetter$3,
  line: legendGetter$2,
  pie: legendGetter$1
};
function getSeriesToDisplay(series) {
  return Object.keys(series).flatMap((seriesType) => legendGetter[seriesType](series[seriesType]));
}
function getLegendUtilityClass(slot) {
  return generateUtilityClass("MuiChartsLegend", slot);
}
generateUtilityClasses("MuiChartsLegend", ["root", "series", "mark", "label", "column", "row"]);
const _excluded$c = ["rotate", "dominantBaseline"], _excluded2$2 = ["label"];
const useUtilityClasses$7 = (ownerState) => {
  const {
    classes,
    direction
  } = ownerState;
  const slots = {
    root: ["root", direction],
    mark: ["mark"],
    label: ["label"],
    series: ["series"]
  };
  return composeClasses(slots, getLegendUtilityClass, classes);
};
const ChartsLegendRoot = styled("g", {
  name: "MuiChartsLegend",
  slot: "Root",
  overridesResolver: (props, styles) => styles.root
})({});
const defaultProps = {
  position: {
    horizontal: "middle",
    vertical: "top"
  },
  direction: "row"
};
const getStandardizedPadding = (padding) => {
  if (typeof padding === "number") {
    return {
      left: padding,
      right: padding,
      top: padding,
      bottom: padding
    };
  }
  return _extends({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  }, padding);
};
function DefaultChartsLegend(props) {
  const {
    hidden,
    position,
    direction,
    seriesToDisplay,
    drawingArea,
    classes,
    itemMarkWidth = 20,
    itemMarkHeight = 20,
    markGap = 5,
    itemGap = 10,
    padding: paddingProps = 10,
    labelStyle: inLabelStyle
  } = props;
  const theme = useTheme();
  const labelStyle = reactExports.useMemo(
    () => _extends({}, theme.typography.subtitle1, {
      color: "inherit",
      dominantBaseline: "central",
      textAnchor: "start",
      fill: (theme.vars || theme).palette.text.primary,
      lineHeight: 1
    }, inLabelStyle),
    // To say to TS that the dominantBaseline and textAnchor are correct
    [inLabelStyle, theme]
  );
  const padding = reactExports.useMemo(() => getStandardizedPadding(paddingProps), [paddingProps]);
  const getItemSpace = reactExports.useCallback((label, inStyle = {}) => {
    const style = _objectWithoutPropertiesLoose(inStyle, _excluded$c);
    const linesSize = getWordsByLines({
      style,
      needsComputation: true,
      text: label
    });
    const innerSize = {
      innerWidth: itemMarkWidth + markGap + Math.max(...linesSize.map((size) => size.width)),
      innerHeight: Math.max(itemMarkHeight, linesSize.length * linesSize[0].height)
    };
    return _extends({}, innerSize, {
      outerWidth: innerSize.innerWidth + itemGap,
      outerHeight: innerSize.innerHeight + itemGap
    });
  }, [itemGap, itemMarkHeight, itemMarkWidth, markGap]);
  const totalWidth = drawingArea.left + drawingArea.width + drawingArea.right;
  const totalHeight = drawingArea.top + drawingArea.height + drawingArea.bottom;
  const availableWidth = totalWidth - padding.left - padding.right;
  const availableHeight = totalHeight - padding.top - padding.bottom;
  const seriesWithPosition = reactExports.useMemo(() => {
    let x2 = 0;
    let y2 = 0;
    let totalWidthUsed = 0;
    let totalHeightUsed = 0;
    let rowIndex = 0;
    const rowMaxHeight = [0];
    const seriesWithRawPosition = seriesToDisplay.map((_ref) => {
      let {
        label
      } = _ref, other = _objectWithoutPropertiesLoose(_ref, _excluded2$2);
      const itemSpace = getItemSpace(label, labelStyle);
      const rep = _extends({}, other, {
        label,
        positionX: x2,
        positionY: y2,
        innerHeight: itemSpace.innerHeight,
        innerWidth: itemSpace.innerWidth,
        outerHeight: itemSpace.outerHeight,
        outerWidth: itemSpace.outerWidth,
        rowIndex
      });
      if (direction === "row") {
        if (x2 + itemSpace.innerWidth > availableWidth) {
          x2 = 0;
          y2 += rowMaxHeight[rowIndex];
          rowIndex += 1;
          if (rowMaxHeight.length <= rowIndex) {
            rowMaxHeight.push(0);
          }
          rep.positionX = x2;
          rep.positionY = y2;
          rep.rowIndex = rowIndex;
        }
        totalWidthUsed = Math.max(totalWidthUsed, x2 + itemSpace.outerWidth);
        totalHeightUsed = Math.max(totalHeightUsed, y2 + itemSpace.outerHeight);
        rowMaxHeight[rowIndex] = Math.max(rowMaxHeight[rowIndex], itemSpace.outerHeight);
        x2 += itemSpace.outerWidth;
      }
      if (direction === "column") {
        if (y2 + itemSpace.innerHeight > availableHeight) {
          x2 = totalWidthUsed + itemGap;
          y2 = 0;
          rowIndex = 0;
          rep.positionX = x2;
          rep.positionY = y2;
          rep.rowIndex = rowIndex;
        }
        if (rowMaxHeight.length <= rowIndex) {
          rowMaxHeight.push(0);
        }
        totalWidthUsed = Math.max(totalWidthUsed, x2 + itemSpace.outerWidth);
        totalHeightUsed = Math.max(totalHeightUsed, y2 + itemSpace.outerHeight);
        rowIndex += 1;
        y2 += itemSpace.outerHeight;
      }
      return rep;
    });
    let gapX = 0;
    let gapY = 0;
    switch (position.horizontal) {
      case "left":
        gapX = padding.left;
        break;
      case "right":
        gapX = totalWidth - padding.right - totalWidthUsed;
        break;
      default:
        gapX = (totalWidth - totalWidthUsed) / 2;
        break;
    }
    switch (position.vertical) {
      case "top":
        gapY = padding.top;
        break;
      case "bottom":
        gapY = totalHeight - padding.bottom - totalHeightUsed;
        break;
      default:
        gapY = (totalHeight - totalHeightUsed) / 2;
        break;
    }
    return seriesWithRawPosition.map((item) => _extends({}, item, {
      // Add the gap due to the position
      positionX: item.positionX + gapX,
      // Add the gap due to the position
      positionY: item.positionY + gapY + (direction === "row" ? rowMaxHeight[item.rowIndex] / 2 : item.outerHeight / 2)
      // Get the center of the item
    }));
  }, [seriesToDisplay, position.horizontal, position.vertical, getItemSpace, labelStyle, direction, availableWidth, availableHeight, itemGap, padding.left, padding.right, padding.top, padding.bottom, totalWidth, totalHeight]);
  if (hidden) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(NoSsr, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsLegendRoot, {
      className: classes.root,
      children: seriesWithPosition.map(({
        id,
        label,
        color: color2,
        positionX,
        positionY
      }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
        className: classes.series,
        transform: `translate(${positionX} ${positionY})`,
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("rect", {
          className: classes.mark,
          y: -itemMarkHeight / 2,
          width: itemMarkWidth,
          height: itemMarkHeight,
          fill: color2
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsText, {
          style: labelStyle,
          text: label,
          x: itemMarkWidth + markGap,
          y: 0
        })]
      }, id))
    })
  });
}
function ChartsLegend(inProps) {
  var _slots$legend;
  const props = useThemeProps({
    props: _extends({}, defaultProps, inProps),
    name: "MuiChartsLegend"
  });
  const {
    position,
    direction,
    hidden,
    slots,
    slotProps
  } = props;
  const theme = useTheme();
  const classes = useUtilityClasses$7(_extends({}, props, {
    theme
  }));
  const drawingArea = reactExports.useContext(DrawingContext);
  const series = reactExports.useContext(SeriesContext);
  const seriesToDisplay = getSeriesToDisplay(series);
  const ChartLegendRender = (_slots$legend = slots == null ? void 0 : slots.legend) != null ? _slots$legend : DefaultChartsLegend;
  const chartLegendRenderProps = useSlotProps({
    elementType: ChartLegendRender,
    externalSlotProps: slotProps == null ? void 0 : slotProps.legend,
    additionalProps: {
      position,
      direction,
      classes,
      drawingArea,
      series,
      hidden,
      seriesToDisplay
    },
    ownerState: {}
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartLegendRender, _extends({}, chartLegendRenderProps));
}
function getValueToPositionMapper(scale) {
  if (isBandScale(scale)) {
    return (value) => scale(value) + scale.bandwidth() / 2;
  }
  return (value) => scale(value);
}
function getAxisHighlightUtilityClass(slot) {
  return generateUtilityClass("MuiChartsAxisHighlight", slot);
}
generateUtilityClasses("MuiChartsAxisHighlight", ["root"]);
const useUtilityClasses$6 = () => {
  const slots = {
    root: ["root"]
  };
  return composeClasses(slots, getAxisHighlightUtilityClass);
};
const ChartsAxisHighlightPath = styled("path", {
  name: "MuiChartsAxisHighlight",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState,
  theme
}) => _extends({
  pointerEvents: "none"
}, ownerState.axisHighlight === "band" && {
  fill: theme.palette.mode === "light" ? "gray" : "white",
  fillOpacity: 0.1
}, ownerState.axisHighlight === "line" && {
  strokeDasharray: "5 2",
  stroke: theme.palette.mode === "light" ? "#000000" : "#ffffff"
}));
function ChartsAxisHighlight(props) {
  const {
    x: xAxisHighlight,
    y: yAxisHighlight
  } = props;
  const {
    xAxisIds,
    xAxis,
    yAxisIds,
    yAxis
  } = reactExports.useContext(CartesianContext);
  const classes = useUtilityClasses$6();
  const USED_X_AXIS_ID = xAxisIds[0];
  const USED_Y_AXIS_ID = yAxisIds[0];
  const xScale = xAxis[USED_X_AXIS_ID].scale;
  const yScale = yAxis[USED_Y_AXIS_ID].scale;
  const {
    axis
  } = reactExports.useContext(InteractionContext);
  const getXPosition = getValueToPositionMapper(xScale);
  const getYPosition = getValueToPositionMapper(yScale);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, {
    children: [xAxisHighlight === "band" && axis.x !== null && isBandScale(xScale) && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlightPath, {
      d: `M ${xScale(axis.x.value) - (xScale.step() - xScale.bandwidth()) / 2} ${yScale.range()[0]} l ${xScale.step()} 0 l 0 ${yScale.range()[1] - yScale.range()[0]} l ${-xScale.step()} 0 Z`,
      className: classes.root,
      ownerState: {
        axisHighlight: "band"
      }
    }), yAxisHighlight === "band" && axis.y !== null && isBandScale(yScale) && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlightPath, {
      d: `M ${xScale.range()[0]} ${yScale(axis.y.value) - (yScale.step() - yScale.bandwidth()) / 2} l 0 ${yScale.step()} l ${xScale.range()[1] - xScale.range()[0]} 0 l 0 ${-yScale.step()} Z`,
      className: classes.root,
      ownerState: {
        axisHighlight: "band"
      }
    }), xAxisHighlight === "line" && axis.x !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlightPath, {
      d: `M ${getXPosition(axis.x.value)} ${yScale.range()[0]} L ${getXPosition(axis.x.value)} ${yScale.range()[1]}`,
      className: classes.root,
      ownerState: {
        axisHighlight: "line"
      }
    }), yAxisHighlight === "line" && axis.y !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlightPath, {
      d: `M ${xScale.range()[0]} ${getYPosition(axis.y.value)} L ${xScale.range()[1]} ${getYPosition(axis.y.value)}`,
      className: classes.root,
      ownerState: {
        axisHighlight: "line"
      }
    })]
  });
}
function ChartsClipPath(props) {
  const {
    id,
    offset: offsetProps
  } = props;
  const {
    left,
    top,
    width,
    height
  } = reactExports.useContext(DrawingContext);
  const offset = _extends({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }, offsetProps);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("clipPath", {
    id,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("rect", {
      x: left - offset.left,
      y: top - offset.top,
      width: width + offset.left + offset.right,
      height: height + offset.top + offset.bottom
    })
  });
}
const BarChart = /* @__PURE__ */ reactExports.forwardRef(function BarChart2(props, ref) {
  const {
    xAxis,
    yAxis,
    series,
    width,
    height,
    margin,
    colors,
    dataset,
    sx,
    layout,
    tooltip,
    axisHighlight,
    legend,
    topAxis,
    leftAxis,
    rightAxis,
    bottomAxis,
    skipAnimation,
    children,
    slots,
    slotProps
  } = props;
  const id = useId();
  const clipPathId = `${id}-clip-path`;
  const hasHorizontalSeries = layout === "horizontal" || layout === void 0 && series.some((item) => item.layout === "horizontal");
  const defaultAxisConfig = {
    scaleType: "band",
    data: Array.from({
      length: Math.max(...series.map((s2) => {
        var _ref, _s$data;
        return ((_ref = (_s$data = s2.data) != null ? _s$data : dataset) != null ? _ref : []).length;
      }))
    }, (_, index) => index)
  };
  const defaultizedAxisHighlight = _extends({}, hasHorizontalSeries ? {
    y: "band"
  } : {
    x: "band"
  }, axisHighlight);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ResponsiveChartContainer, {
    ref,
    series: series.map((s2) => _extends({
      type: "bar"
    }, s2, {
      layout: hasHorizontalSeries ? "horizontal" : "vertical"
    })),
    width,
    height,
    margin,
    xAxis: xAxis != null ? xAxis : hasHorizontalSeries ? void 0 : [_extends({
      id: DEFAULT_X_AXIS_KEY
    }, defaultAxisConfig)],
    yAxis: yAxis != null ? yAxis : hasHorizontalSeries ? [_extends({
      id: DEFAULT_Y_AXIS_KEY
    }, defaultAxisConfig)] : void 0,
    colors,
    dataset,
    sx,
    disableAxisListener: (tooltip == null ? void 0 : tooltip.trigger) !== "axis" && (axisHighlight == null ? void 0 : axisHighlight.x) === "none" && (axisHighlight == null ? void 0 : axisHighlight.y) === "none",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("g", {
      clipPath: `url(#${clipPathId})`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(BarPlot, {
        slots,
        slotProps,
        skipAnimation
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxis, {
      topAxis,
      leftAxis,
      rightAxis,
      bottomAxis,
      slots,
      slotProps
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsLegend, _extends({}, legend, {
      slots,
      slotProps
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlight, _extends({}, defaultizedAxisHighlight)), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltip, _extends({}, tooltip, {
      slots,
      slotProps
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsClipPath, {
      id: clipPathId
    }), children]
  });
});
const _excluded$b = ["id", "classes", "color", "highlightScope", "slots", "slotProps"];
function getAreaElementUtilityClass(slot) {
  return generateUtilityClass("MuiAreaElement", slot);
}
generateUtilityClasses("MuiAreaElement", ["root", "highlighted", "faded"]);
const useUtilityClasses$5 = (ownerState) => {
  const {
    classes,
    id,
    isFaded,
    isHighlighted
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`, isHighlighted && "highlighted", isFaded && "faded"]
  };
  return composeClasses(slots, getAreaElementUtilityClass, classes);
};
const AreaElementPath = styled("path", {
  name: "MuiAreaElement",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState
}) => ({
  stroke: "none",
  fill: ownerState.isHighlighted ? color(ownerState.color).brighter(1).formatHex() : color(ownerState.color).brighter(0.5).formatHex(),
  transition: "opacity 0.2s ease-in, fill 0.2s ease-in",
  opacity: ownerState.isFaded ? 0.3 : 1
}));
AreaElementPath.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "yarn proptypes"  |
  // ----------------------------------------------------------------------
  as: PropTypes.elementType,
  ownerState: PropTypes.shape({
    classes: PropTypes.object,
    color: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    isFaded: PropTypes.bool.isRequired,
    isHighlighted: PropTypes.bool.isRequired
  }).isRequired,
  sx: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])), PropTypes.func, PropTypes.object])
};
function AreaElement(props) {
  var _slots$area;
  const {
    id,
    classes: innerClasses,
    color: color2,
    highlightScope,
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$b);
  const getInteractionItemProps = useInteractionItemProps(highlightScope);
  const {
    item
  } = reactExports.useContext(InteractionContext);
  const isHighlighted = getIsHighlighted(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const isFaded = !isHighlighted && getIsFaded(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const ownerState = {
    id,
    classes: innerClasses,
    color: color2,
    isFaded,
    isHighlighted
  };
  const classes = useUtilityClasses$5(ownerState);
  const Area = (_slots$area = slots == null ? void 0 : slots.area) != null ? _slots$area : AreaElementPath;
  const areaProps = useSlotProps({
    elementType: Area,
    externalSlotProps: slotProps == null ? void 0 : slotProps.area,
    additionalProps: _extends({}, other, getInteractionItemProps({
      type: "line",
      seriesId: id
    }), {
      className: classes.root
    }),
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Area, _extends({}, areaProps));
}
function getCurveFactory(curveType) {
  switch (curveType) {
    case "catmullRom": {
      return curveCatmullRom.alpha(0.5);
    }
    case "linear": {
      return curveLinear;
    }
    case "monotoneX": {
      return monotoneX;
    }
    case "monotoneY": {
      return monotoneY;
    }
    case "natural": {
      return curveNatural;
    }
    case "step": {
      return curveStep;
    }
    case "stepBefore": {
      return stepBefore;
    }
    case "stepAfter": {
      return stepAfter;
    }
    default:
      return monotoneX;
  }
}
const _excluded$a = ["slots", "slotProps"];
function AreaPlot(props) {
  const {
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$a);
  const seriesData = reactExports.useContext(SeriesContext).line;
  const axisData = reactExports.useContext(CartesianContext);
  if (seriesData === void 0) {
    return null;
  }
  const {
    series,
    stackingGroups
  } = seriesData;
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = axisData;
  const defaultXAxisId = xAxisIds[0];
  const defaultYAxisId = yAxisIds[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: stackingGroups.flatMap(({
      ids: groupIds
    }) => {
      return groupIds.flatMap((seriesId) => {
        var _xData$map;
        const {
          xAxisKey = defaultXAxisId,
          yAxisKey = defaultYAxisId,
          stackedData,
          data,
          connectNulls
        } = series[seriesId];
        const xScale = getValueToPositionMapper(xAxis[xAxisKey].scale);
        const yScale = yAxis[yAxisKey].scale;
        const xData = xAxis[xAxisKey].data;
        const areaPath = d3Area().x((d) => xScale(d.x)).defined((_, i) => connectNulls || data[i] != null).y0((d) => d.y && yScale(d.y[0])).y1((d) => d.y && yScale(d.y[1]));
        const curve = getCurveFactory(series[seriesId].curve);
        const formattedData = (_xData$map = xData == null ? void 0 : xData.map((x2, index) => ({
          x: x2,
          y: stackedData[index]
        }))) != null ? _xData$map : [];
        const d3Data = connectNulls ? formattedData.filter((_, i) => data[i] != null) : formattedData;
        return !!series[seriesId].area && /* @__PURE__ */ jsxRuntimeExports.jsx(AreaElement, {
          id: seriesId,
          d: areaPath.curve(curve)(d3Data) || void 0,
          color: series[seriesId].color,
          highlightScope: series[seriesId].highlightScope,
          slots,
          slotProps
        }, seriesId);
      });
    })
  }));
}
const _excluded$9 = ["id", "classes", "color", "highlightScope", "slots", "slotProps"];
function getLineElementUtilityClass(slot) {
  return generateUtilityClass("MuiLineElement", slot);
}
generateUtilityClasses("MuiLineElement", ["root", "highlighted", "faded"]);
const useUtilityClasses$4 = (ownerState) => {
  const {
    classes,
    id,
    isFaded,
    isHighlighted
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`, isHighlighted && "highlighted", isFaded && "faded"]
  };
  return composeClasses(slots, getLineElementUtilityClass, classes);
};
const LineElementPath = styled("path", {
  name: "MuiLineElement",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState
}) => ({
  strokeWidth: 2,
  strokeLinejoin: "round",
  fill: "none",
  stroke: ownerState.isHighlighted ? color(ownerState.color).brighter(0.5).formatHex() : ownerState.color,
  transition: "opacity 0.2s ease-in, stroke 0.2s ease-in",
  opacity: ownerState.isFaded ? 0.3 : 1
}));
LineElementPath.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "yarn proptypes"  |
  // ----------------------------------------------------------------------
  as: PropTypes.elementType,
  ownerState: PropTypes.shape({
    classes: PropTypes.object,
    color: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    isFaded: PropTypes.bool.isRequired,
    isHighlighted: PropTypes.bool.isRequired
  }).isRequired,
  sx: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])), PropTypes.func, PropTypes.object])
};
function LineElement(props) {
  var _slots$line;
  const {
    id,
    classes: innerClasses,
    color: color2,
    highlightScope,
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$9);
  const getInteractionItemProps = useInteractionItemProps(highlightScope);
  const {
    item
  } = reactExports.useContext(InteractionContext);
  const isHighlighted = getIsHighlighted(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const isFaded = !isHighlighted && getIsFaded(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const ownerState = {
    id,
    classes: innerClasses,
    color: color2,
    isFaded,
    isHighlighted
  };
  const classes = useUtilityClasses$4(ownerState);
  const Line = (_slots$line = slots == null ? void 0 : slots.line) != null ? _slots$line : LineElementPath;
  const lineProps = useSlotProps({
    elementType: Line,
    externalSlotProps: slotProps == null ? void 0 : slotProps.line,
    additionalProps: _extends({}, other, getInteractionItemProps({
      type: "line",
      seriesId: id
    }), {
      className: classes.root
    }),
    ownerState
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Line, _extends({}, lineProps));
}
const _excluded$8 = ["slots", "slotProps"];
function LinePlot(props) {
  const {
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$8);
  const seriesData = reactExports.useContext(SeriesContext).line;
  const axisData = reactExports.useContext(CartesianContext);
  if (seriesData === void 0) {
    return null;
  }
  const {
    series,
    stackingGroups
  } = seriesData;
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = axisData;
  const defaultXAxisId = xAxisIds[0];
  const defaultYAxisId = yAxisIds[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: stackingGroups.flatMap(({
      ids: groupIds
    }) => {
      return groupIds.flatMap((seriesId) => {
        var _xData$map;
        const {
          xAxisKey = defaultXAxisId,
          yAxisKey = defaultYAxisId,
          stackedData,
          data,
          connectNulls
        } = series[seriesId];
        const xScale = getValueToPositionMapper(xAxis[xAxisKey].scale);
        const yScale = yAxis[yAxisKey].scale;
        const xData = xAxis[xAxisKey].data;
        const linePath = d3Line().x((d) => xScale(d.x)).defined((_, i) => connectNulls || data[i] != null).y((d) => yScale(d.y[1]));
        const curve = getCurveFactory(series[seriesId].curve);
        const formattedData = (_xData$map = xData == null ? void 0 : xData.map((x2, index) => ({
          x: x2,
          y: stackedData[index]
        }))) != null ? _xData$map : [];
        const d3Data = connectNulls ? formattedData.filter((_, i) => data[i] != null) : formattedData;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(LineElement, {
          id: seriesId,
          d: linePath.curve(curve)(d3Data) || void 0,
          color: series[seriesId].color,
          highlightScope: series[seriesId].highlightScope,
          slots,
          slotProps
        }, seriesId);
      });
    })
  }));
}
function getSymbol(shape) {
  const symbolNames = "circle cross diamond square star triangle wye".split(/ /);
  return symbolNames.indexOf(shape) || 0;
}
function getPercentageValue(value, refValue) {
  if (typeof value === "number") {
    return value;
  }
  if (value === "100%") {
    return refValue;
  }
  if (value.endsWith("%")) {
    const percentage = Number.parseFloat(value.slice(0, value.length - 1));
    if (!Number.isNaN(percentage)) {
      return percentage * refValue / 100;
    }
  }
  if (value.endsWith("px")) {
    const val = Number.parseFloat(value.slice(0, value.length - 2));
    if (!Number.isNaN(val)) {
      return val;
    }
  }
  throw Error(`MUI-Charts: Received an unknown value "${value}". It should be a number, or a string with a percentage value.`);
}
const _excluded$7 = ["x", "y", "id", "classes", "color", "shape", "dataIndex", "highlightScope"];
function getMarkElementUtilityClass(slot) {
  return generateUtilityClass("MuiMarkElement", slot);
}
generateUtilityClasses("MuiMarkElement", ["root", "highlighted", "faded"]);
const useUtilityClasses$3 = (ownerState) => {
  const {
    classes,
    id,
    isFaded,
    isHighlighted
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`, isHighlighted && "highlighted", isFaded && "faded"]
  };
  return composeClasses(slots, getMarkElementUtilityClass, classes);
};
const MarkElementPath = styled("path", {
  name: "MuiMarkElement",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState,
  theme
}) => ({
  transform: `translate(${ownerState.x}px, ${ownerState.y}px)`,
  transformOrigin: `${ownerState.x}px ${ownerState.y}px`,
  fill: (theme.vars || theme).palette.background.paper,
  stroke: ownerState.color,
  strokeWidth: 2
}));
MarkElementPath.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "yarn proptypes"  |
  // ----------------------------------------------------------------------
  as: PropTypes.elementType,
  ownerState: PropTypes.shape({
    classes: PropTypes.object,
    color: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    isFaded: PropTypes.bool.isRequired,
    isHighlighted: PropTypes.bool.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }).isRequired,
  sx: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])), PropTypes.func, PropTypes.object])
};
function MarkElement(props) {
  var _axis$x;
  const {
    x: x2,
    y: y2,
    id,
    classes: innerClasses,
    color: color2,
    shape,
    dataIndex,
    highlightScope
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$7);
  const getInteractionItemProps = useInteractionItemProps(highlightScope);
  const {
    item,
    axis
  } = reactExports.useContext(InteractionContext);
  const isHighlighted = ((_axis$x = axis.x) == null ? void 0 : _axis$x.index) === dataIndex || getIsHighlighted(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const isFaded = !isHighlighted && getIsFaded(item, {
    type: "line",
    seriesId: id
  }, highlightScope);
  const ownerState = {
    id,
    classes: innerClasses,
    isHighlighted,
    isFaded,
    color: color2,
    x: x2,
    y: y2
  };
  const classes = useUtilityClasses$3(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MarkElementPath, _extends({}, other, {
    ownerState,
    className: classes.root,
    d: Symbol$1(symbolsFill[getSymbol(shape)])()
  }, getInteractionItemProps({
    type: "line",
    seriesId: id,
    dataIndex
  })));
}
const _excluded$6 = ["slots", "slotProps"];
function MarkPlot(props) {
  var _slots$mark;
  const {
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$6);
  const seriesData = reactExports.useContext(SeriesContext).line;
  const axisData = reactExports.useContext(CartesianContext);
  const Mark = (_slots$mark = slots == null ? void 0 : slots.mark) != null ? _slots$mark : MarkElement;
  if (seriesData === void 0) {
    return null;
  }
  const {
    series,
    stackingGroups
  } = seriesData;
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = axisData;
  const defaultXAxisId = xAxisIds[0];
  const defaultYAxisId = yAxisIds[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: stackingGroups.flatMap(({
      ids: groupIds
    }) => {
      return groupIds.flatMap((seriesId) => {
        const {
          xAxisKey = defaultXAxisId,
          yAxisKey = defaultYAxisId,
          stackedData,
          data,
          showMark = true
        } = series[seriesId];
        if (showMark === false) {
          return null;
        }
        const xScale = getValueToPositionMapper(xAxis[xAxisKey].scale);
        const yScale = yAxis[yAxisKey].scale;
        const xData = xAxis[xAxisKey].data;
        const xRange = xAxis[xAxisKey].scale.range();
        const yRange = yScale.range();
        const isInRange = ({
          x: x2,
          y: y2
        }) => {
          if (x2 < Math.min(...xRange) || x2 > Math.max(...xRange)) {
            return false;
          }
          if (y2 < Math.min(...yRange) || y2 > Math.max(...yRange)) {
            return false;
          }
          return true;
        };
        if (xData === void 0) {
          throw new Error(`MUI-X-Charts: ${xAxisKey === DEFAULT_X_AXIS_KEY ? "The first `xAxis`" : `The x-axis with id "${xAxisKey}"`} should have data property to be able to display a line plot`);
        }
        return xData == null ? void 0 : xData.map((x2, index) => {
          const value = data[index] == null ? null : stackedData[index][1];
          return {
            x: xScale(x2),
            y: value === null ? null : yScale(value),
            position: x2,
            value,
            index
          };
        }).filter(({
          x: x2,
          y: y2,
          index,
          position,
          value
        }) => {
          if (value === null || y2 === null) {
            return false;
          }
          if (!isInRange({
            x: x2,
            y: y2
          })) {
            return false;
          }
          if (showMark === true) {
            return true;
          }
          return showMark({
            x: x2,
            y: y2,
            index,
            position,
            value
          });
        }).map(({
          x: x2,
          y: y2,
          index
        }) => {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Mark, _extends({
            id: seriesId,
            dataIndex: index,
            shape: "circle",
            color: series[seriesId].color,
            x: x2,
            y: y2,
            highlightScope: series[seriesId].highlightScope
          }, slotProps == null ? void 0 : slotProps.mark), `${seriesId}-${index}`);
        });
      });
    })
  }));
}
const _excluded$5 = ["x", "y", "id", "classes", "color"];
function getHighlightElementUtilityClass(slot) {
  return generateUtilityClass("MuiHighlightElement", slot);
}
generateUtilityClasses("MuiHighlightElement", ["root"]);
const useUtilityClasses$2 = (ownerState) => {
  const {
    classes,
    id
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`]
  };
  return composeClasses(slots, getHighlightElementUtilityClass, classes);
};
const HighlightElement = styled("circle", {
  name: "MuiHighlightElement",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  ownerState
}) => ({
  transform: `translate(${ownerState.x}px, ${ownerState.y}px)`,
  transformOrigin: `${ownerState.x}px ${ownerState.y}px`,
  fill: ownerState.color
}));
function LineHighlightElement(props) {
  const {
    x: x2,
    y: y2,
    id,
    classes: innerClasses,
    color: color2
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$5);
  const ownerState = {
    id,
    classes: innerClasses,
    color: color2,
    x: x2,
    y: y2
  };
  const classes = useUtilityClasses$2(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightElement, _extends({}, other, {
    ownerState,
    className: classes.root,
    cx: 0,
    cy: 0,
    r: other.r === void 0 ? 5 : other.r
  }));
}
const _excluded$4 = ["slots", "slotProps"];
function LineHighlightPlot(props) {
  var _axis$x, _slots$lineHighlight;
  const {
    slots,
    slotProps
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$4);
  const seriesData = reactExports.useContext(SeriesContext).line;
  const axisData = reactExports.useContext(CartesianContext);
  const {
    axis
  } = reactExports.useContext(InteractionContext);
  const highlightedIndex = (_axis$x = axis.x) == null ? void 0 : _axis$x.index;
  if (highlightedIndex === void 0) {
    return null;
  }
  if (seriesData === void 0) {
    return null;
  }
  const {
    series,
    stackingGroups
  } = seriesData;
  const {
    xAxis,
    yAxis,
    xAxisIds,
    yAxisIds
  } = axisData;
  const defaultXAxisId = xAxisIds[0];
  const defaultYAxisId = yAxisIds[0];
  const Element = (_slots$lineHighlight = slots == null ? void 0 : slots.lineHighlight) != null ? _slots$lineHighlight : LineHighlightElement;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: stackingGroups.flatMap(({
      ids: groupIds
    }) => {
      return groupIds.flatMap((seriesId) => {
        const {
          xAxisKey = defaultXAxisId,
          yAxisKey = defaultYAxisId,
          stackedData,
          data,
          disableHighlight
        } = series[seriesId];
        if (disableHighlight || data[highlightedIndex] == null) {
          return null;
        }
        const xScale = getValueToPositionMapper(xAxis[xAxisKey].scale);
        const yScale = yAxis[yAxisKey].scale;
        const xData = xAxis[xAxisKey].data;
        if (xData === void 0) {
          throw new Error(`MUI-X-Charts: ${xAxisKey === DEFAULT_X_AXIS_KEY ? "The first `xAxis`" : `The x-axis with id "${xAxisKey}"`} should have data property to be able to display a line plot.`);
        }
        const x2 = xScale(xData[highlightedIndex]);
        const y2 = yScale(stackedData[highlightedIndex][1]);
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Element, _extends({
          id: seriesId,
          color: series[seriesId].color,
          x: x2,
          y: y2
        }, slotProps == null ? void 0 : slotProps.lineHighlight), `${seriesId}`);
      });
    })
  }));
}
const LineChart = /* @__PURE__ */ reactExports.forwardRef(function LineChart2(props, ref) {
  const {
    xAxis,
    yAxis,
    series,
    width,
    height,
    margin,
    colors,
    dataset,
    sx,
    tooltip,
    axisHighlight = {
      x: "line"
    },
    disableLineItemHighlight,
    legend,
    topAxis,
    leftAxis,
    rightAxis,
    bottomAxis,
    children,
    slots,
    slotProps
  } = props;
  const id = useId();
  const clipPathId = `${id}-clip-path`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ResponsiveChartContainer, {
    ref,
    series: series.map((s2) => _extends({
      disableHighlight: !!disableLineItemHighlight,
      type: "line"
    }, s2)),
    width,
    height,
    margin,
    xAxis: xAxis != null ? xAxis : [{
      id: DEFAULT_X_AXIS_KEY,
      scaleType: "point",
      data: Array.from({
        length: Math.max(...series.map((s2) => {
          var _ref, _s$data;
          return ((_ref = (_s$data = s2.data) != null ? _s$data : dataset) != null ? _ref : []).length;
        }))
      }, (_, index) => index)
    }],
    yAxis,
    colors,
    dataset,
    sx,
    disableAxisListener: (tooltip == null ? void 0 : tooltip.trigger) !== "axis" && (axisHighlight == null ? void 0 : axisHighlight.x) === "none" && (axisHighlight == null ? void 0 : axisHighlight.y) === "none",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
      clipPath: `url(#${clipPathId})`,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AreaPlot, {
        slots,
        slotProps
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(LinePlot, {
        slots,
        slotProps
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxis, {
      topAxis,
      leftAxis,
      rightAxis,
      bottomAxis,
      slots,
      slotProps
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlight, _extends({}, axisHighlight)), /* @__PURE__ */ jsxRuntimeExports.jsx(MarkPlot, {
      slots,
      slotProps
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(LineHighlightPlot, {
      slots,
      slotProps
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsLegend, _extends({}, legend, {
      slots,
      slotProps
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltip, _extends({}, tooltip, {
      slots,
      slotProps
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsClipPath, {
      id: clipPathId
    }), children]
  });
});
const _excluded$3 = ["id", "dataIndex", "classes", "color", "highlightScope", "onClick", "isFaded", "isHighlighted", "startAngle", "endAngle", "paddingAngle", "innerRadius", "outerRadius", "cornerRadius"];
function getPieArcUtilityClass(slot) {
  return generateUtilityClass("MuiPieArc", slot);
}
generateUtilityClasses("MuiPieArc", ["root", "highlighted", "faded"]);
const useUtilityClasses$1 = (ownerState) => {
  const {
    classes,
    id,
    isFaded,
    isHighlighted
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`, isHighlighted && "highlighted", isFaded && "faded"]
  };
  return composeClasses(slots, getPieArcUtilityClass, classes);
};
const PieArcRoot = styled(animated.path, {
  name: "MuiPieArc",
  slot: "Root",
  overridesResolver: (_, styles) => styles.arc
})(({
  theme
}) => ({
  stroke: (theme.vars || theme).palette.background.paper,
  strokeWidth: 1,
  strokeLinejoin: "round"
}));
function PieArc(props) {
  const {
    id,
    dataIndex,
    classes: innerClasses,
    color: color2,
    highlightScope,
    onClick,
    isFaded,
    isHighlighted,
    startAngle,
    endAngle,
    paddingAngle,
    innerRadius,
    outerRadius,
    cornerRadius
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$3);
  const ownerState = {
    id,
    dataIndex,
    classes: innerClasses,
    color: color2,
    isFaded,
    isHighlighted
  };
  const classes = useUtilityClasses$1(ownerState);
  const getInteractionItemProps = useInteractionItemProps(highlightScope);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PieArcRoot, _extends({
    d: to([startAngle, endAngle, paddingAngle, innerRadius, outerRadius, cornerRadius], (sA, eA, pA, iR, oR, cR) => d3Arc().cornerRadius(cR)({
      padAngle: pA,
      startAngle: sA,
      endAngle: eA,
      innerRadius: iR,
      outerRadius: oR
    })),
    onClick,
    cursor: onClick ? "pointer" : "unset",
    ownerState,
    className: classes.root
  }, other, getInteractionItemProps({
    type: "pie",
    seriesId: id,
    dataIndex
  })));
}
const defaultTransitionConfig = {
  keys: (item) => item.id,
  from: ({
    innerRadius,
    outerRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    color: color2,
    isFaded
  }) => ({
    innerRadius,
    outerRadius: (innerRadius + outerRadius) / 2,
    cornerRadius,
    startAngle: (startAngle + endAngle) / 2,
    endAngle: (startAngle + endAngle) / 2,
    paddingAngle,
    fill: color2,
    opacity: isFaded ? 0.3 : 1
  }),
  leave: ({
    innerRadius,
    startAngle,
    endAngle
  }) => ({
    innerRadius,
    outerRadius: innerRadius,
    startAngle: (startAngle + endAngle) / 2,
    endAngle: (startAngle + endAngle) / 2
  }),
  enter: ({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle
  }) => ({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle
  }),
  update: ({
    innerRadius,
    outerRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    color: color2,
    isFaded
  }) => ({
    innerRadius,
    outerRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    fill: color2,
    opacity: isFaded ? 0.3 : 1
  }),
  config: {
    tension: 120,
    friction: 14,
    clamp: true
  }
};
const defaultLabelTransitionConfig = {
  keys: (item) => item.id,
  from: ({
    innerRadius,
    outerRadius,
    arcLabelRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle
  }) => ({
    innerRadius,
    outerRadius: (innerRadius + outerRadius) / 2,
    cornerRadius,
    arcLabelRadius,
    startAngle: (startAngle + endAngle) / 2,
    endAngle: (startAngle + endAngle) / 2,
    paddingAngle,
    opacity: 0
  }),
  leave: ({
    innerRadius,
    startAngle,
    endAngle
  }) => ({
    innerRadius,
    outerRadius: innerRadius,
    arcLabelRadius: innerRadius,
    startAngle: (startAngle + endAngle) / 2,
    endAngle: (startAngle + endAngle) / 2,
    opacity: 0
  }),
  enter: ({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    arcLabelRadius
  }) => ({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    arcLabelRadius,
    opacity: 1
  }),
  update: ({
    innerRadius,
    outerRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    arcLabelRadius
  }) => ({
    innerRadius,
    outerRadius,
    cornerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    arcLabelRadius,
    opacity: 1
  }),
  config: {
    tension: 120,
    friction: 14,
    clamp: true
  }
};
function useTransformData(series) {
  const {
    id: seriesId,
    highlightScope,
    data,
    faded,
    highlighted,
    paddingAngle: basePaddingAngle = 0,
    innerRadius: baseInnerRadius = 0,
    arcLabelRadius: baseArcLabelRadius,
    outerRadius: baseOuterRadius,
    cornerRadius: baseCornerRadius = 0
  } = series;
  const {
    item: highlightedItem
  } = reactExports.useContext(InteractionContext);
  const getHighlightStatus = reactExports.useCallback((dataIndex) => {
    const isHighlighted = getIsHighlighted(highlightedItem, {
      type: "pie",
      seriesId,
      dataIndex
    }, highlightScope);
    const isFaded = !isHighlighted && getIsFaded(highlightedItem, {
      type: "pie",
      seriesId,
      dataIndex
    }, highlightScope);
    return {
      isHighlighted,
      isFaded
    };
  }, [highlightScope, highlightedItem, seriesId]);
  const dataWithHighlight = reactExports.useMemo(() => data.map((item, itemIndex) => {
    var _attributesOverride$p, _attributesOverride$i, _attributesOverride$o, _attributesOverride$c, _ref, _attributesOverride$a;
    const {
      isHighlighted,
      isFaded
    } = getHighlightStatus(itemIndex);
    const attributesOverride = _extends({
      additionalRadius: 0
    }, isFaded && faded || isHighlighted && highlighted || {});
    const paddingAngle = Math.max(0, Math.PI * ((_attributesOverride$p = attributesOverride.paddingAngle) != null ? _attributesOverride$p : basePaddingAngle) / 180);
    const innerRadius = Math.max(0, (_attributesOverride$i = attributesOverride.innerRadius) != null ? _attributesOverride$i : baseInnerRadius);
    const outerRadius = Math.max(0, (_attributesOverride$o = attributesOverride.outerRadius) != null ? _attributesOverride$o : baseOuterRadius + attributesOverride.additionalRadius);
    const cornerRadius = (_attributesOverride$c = attributesOverride.cornerRadius) != null ? _attributesOverride$c : baseCornerRadius;
    const arcLabelRadius = (_ref = (_attributesOverride$a = attributesOverride.arcLabelRadius) != null ? _attributesOverride$a : baseArcLabelRadius) != null ? _ref : (innerRadius + outerRadius) / 2;
    return _extends({}, item, attributesOverride, {
      isFaded,
      isHighlighted,
      paddingAngle,
      innerRadius,
      outerRadius,
      cornerRadius,
      arcLabelRadius
    });
  }), [baseCornerRadius, baseInnerRadius, baseOuterRadius, basePaddingAngle, baseArcLabelRadius, data, faded, getHighlightStatus, highlighted]);
  return dataWithHighlight;
}
const _excluded$2 = ["slots", "slotProps", "innerRadius", "outerRadius", "cornerRadius", "paddingAngle", "id", "highlightScope", "highlighted", "faded", "data", "onClick", "skipAnimation"], _excluded2$1 = ["startAngle", "endAngle", "paddingAngle", "innerRadius", "arcLabelRadius", "outerRadius", "cornerRadius"];
function PieArcPlot(props) {
  var _slots$pieArc;
  const {
    slots,
    slotProps,
    innerRadius = 0,
    outerRadius,
    cornerRadius = 0,
    paddingAngle = 0,
    id,
    highlightScope,
    highlighted,
    faded = {
      additionalRadius: -5
    },
    data,
    onClick,
    skipAnimation
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$2);
  const transformedData = useTransformData({
    innerRadius,
    outerRadius,
    cornerRadius,
    paddingAngle,
    id,
    highlightScope,
    highlighted,
    faded,
    data
  });
  const transition = useTransition(transformedData, _extends({}, defaultTransitionConfig, {
    immediate: skipAnimation
  }));
  if (data.length === 0) {
    return null;
  }
  const Arc = (_slots$pieArc = slots == null ? void 0 : slots.pieArc) != null ? _slots$pieArc : PieArc;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: transition((_ref, item, _, index) => {
      let {
        startAngle,
        endAngle,
        paddingAngle: pA,
        innerRadius: iR,
        outerRadius: oR,
        cornerRadius: cR
      } = _ref, style = _objectWithoutPropertiesLoose(_ref, _excluded2$1);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Arc, _extends({
        startAngle,
        endAngle,
        paddingAngle: pA,
        innerRadius: iR,
        outerRadius: oR,
        cornerRadius: cR,
        style,
        id,
        color: item.color,
        dataIndex: index,
        highlightScope,
        isFaded: item.isFaded,
        isHighlighted: item.isHighlighted,
        onClick: onClick && ((event) => {
          onClick(event, {
            type: "pie",
            seriesId: id,
            dataIndex: index
          }, item);
        })
      }, slotProps == null ? void 0 : slotProps.pieArc));
    })
  }));
}
const _excluded$1 = ["id", "classes", "color", "startAngle", "endAngle", "paddingAngle", "arcLabelRadius", "innerRadius", "outerRadius", "cornerRadius", "formattedArcLabel", "isHighlighted", "isFaded", "style"];
function getPieArcLabelUtilityClass(slot) {
  return generateUtilityClass("MuiPieArcLabel", slot);
}
generateUtilityClasses("MuiPieArcLabel", ["root", "highlighted", "faded"]);
const useUtilityClasses = (ownerState) => {
  const {
    classes,
    id,
    isFaded,
    isHighlighted
  } = ownerState;
  const slots = {
    root: ["root", `series-${id}`, isHighlighted && "highlighted", isFaded && "faded"]
  };
  return composeClasses(slots, getPieArcLabelUtilityClass, classes);
};
const PieArcLabelRoot = styled(animated.text, {
  name: "MuiPieArcLabel",
  slot: "Root",
  overridesResolver: (_, styles) => styles.root
})(({
  theme
}) => ({
  fill: (theme.vars || theme).palette.text.primary,
  textAnchor: "middle",
  dominantBaseline: "middle"
}));
const getLabelPosition = (formattedArcLabel, variable) => (startAngle, endAngle, padAngle, arcLabelRadius, cornerRadius) => {
  if (!formattedArcLabel) {
    return 0;
  }
  const [x2, y2] = d3Arc().cornerRadius(cornerRadius).centroid({
    padAngle,
    startAngle,
    endAngle,
    innerRadius: arcLabelRadius,
    outerRadius: arcLabelRadius
  });
  if (variable === "x") {
    return x2;
  }
  return y2;
};
function PieArcLabel(props) {
  const {
    id,
    classes: innerClasses,
    color: color2,
    startAngle,
    endAngle,
    paddingAngle,
    arcLabelRadius,
    cornerRadius,
    formattedArcLabel,
    isHighlighted,
    isFaded,
    style
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded$1);
  const ownerState = {
    id,
    classes: innerClasses,
    isFaded,
    isHighlighted
  };
  const classes = useUtilityClasses(ownerState);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PieArcLabelRoot, _extends({
    className: classes.root
  }, other, {
    style: _extends({
      x: to([startAngle, endAngle, paddingAngle, arcLabelRadius, cornerRadius], getLabelPosition(formattedArcLabel, "x")),
      y: to([startAngle, endAngle, paddingAngle, arcLabelRadius, cornerRadius], getLabelPosition(formattedArcLabel, "y"))
    }, style),
    children: formattedArcLabel
  }));
}
const _excluded = ["slots", "slotProps", "innerRadius", "outerRadius", "arcLabelRadius", "cornerRadius", "paddingAngle", "id", "highlightScope", "highlighted", "faded", "data", "arcLabel", "arcLabelMinAngle", "skipAnimation"], _excluded2 = ["startAngle", "endAngle", "paddingAngle", "innerRadius", "outerRadius", "arcLabelRadius", "cornerRadius"];
const RATIO = 180 / Math.PI;
function getItemLabel(arcLabel, arcLabelMinAngle, item) {
  if (!arcLabel) {
    return null;
  }
  const angle = (item.endAngle - item.startAngle) * RATIO;
  if (angle < arcLabelMinAngle) {
    return null;
  }
  if (typeof arcLabel === "string") {
    var _item$arcLabel;
    return (_item$arcLabel = item[arcLabel]) == null ? void 0 : _item$arcLabel.toString();
  }
  return arcLabel(item);
}
function PieArcLabelPlot(props) {
  var _slots$pieArcLabel;
  const {
    slots,
    slotProps,
    innerRadius,
    outerRadius,
    arcLabelRadius,
    cornerRadius = 0,
    paddingAngle = 0,
    id,
    highlightScope,
    highlighted,
    faded = {
      additionalRadius: -5
    },
    data,
    arcLabel,
    arcLabelMinAngle = 0,
    skipAnimation
  } = props, other = _objectWithoutPropertiesLoose(props, _excluded);
  const transformedData = useTransformData({
    innerRadius,
    outerRadius,
    arcLabelRadius,
    cornerRadius,
    paddingAngle,
    id,
    highlightScope,
    highlighted,
    faded,
    data
  });
  const transition = useTransition(transformedData, _extends({}, defaultLabelTransitionConfig, {
    immediate: skipAnimation
  }));
  if (data.length === 0) {
    return null;
  }
  const ArcLabel = (_slots$pieArcLabel = slots == null ? void 0 : slots.pieArcLabel) != null ? _slots$pieArcLabel : PieArcLabel;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("g", _extends({}, other, {
    children: transition((_ref, item) => {
      let {
        startAngle,
        endAngle,
        paddingAngle: pA,
        innerRadius: iR,
        outerRadius: oR,
        arcLabelRadius: aLR,
        cornerRadius: cR
      } = _ref, style = _objectWithoutPropertiesLoose(_ref, _excluded2);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ArcLabel, _extends({
        startAngle,
        endAngle,
        paddingAngle: pA,
        innerRadius: iR,
        outerRadius: oR,
        arcLabelRadius: aLR,
        cornerRadius: cR,
        style,
        id,
        color: item.color,
        isFaded: item.isFaded,
        isHighlighted: item.isHighlighted,
        formattedArcLabel: getItemLabel(arcLabel, arcLabelMinAngle, item)
      }, slotProps == null ? void 0 : slotProps.pieArcLabel));
    })
  }));
}
function PiePlot(props) {
  const {
    skipAnimation,
    slots,
    slotProps,
    onClick
  } = props;
  const seriesData = reactExports.useContext(SeriesContext).pie;
  const {
    left,
    top,
    width,
    height
  } = reactExports.useContext(DrawingContext);
  if (seriesData === void 0) {
    return null;
  }
  const availableRadius = Math.min(width, height) / 2;
  const {
    series,
    seriesOrder
  } = seriesData;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
    children: [seriesOrder.map((seriesId) => {
      const {
        innerRadius: innerRadiusParam,
        outerRadius: outerRadiusParam,
        cornerRadius,
        paddingAngle,
        data,
        cx: cxParam,
        cy: cyParam,
        highlighted,
        faded,
        highlightScope
      } = series[seriesId];
      const outerRadius = getPercentageValue(outerRadiusParam != null ? outerRadiusParam : availableRadius, availableRadius);
      const innerRadius = getPercentageValue(innerRadiusParam != null ? innerRadiusParam : 0, availableRadius);
      const cx = getPercentageValue(cxParam != null ? cxParam : "50%", width);
      const cy = getPercentageValue(cyParam != null ? cyParam : "50%", height);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("g", {
        transform: `translate(${left + cx}, ${top + cy})`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(PieArcPlot, {
          innerRadius,
          outerRadius,
          cornerRadius,
          paddingAngle,
          id: seriesId,
          data,
          skipAnimation,
          highlightScope,
          highlighted,
          faded,
          onClick,
          slots,
          slotProps
        })
      }, seriesId);
    }), seriesOrder.map((seriesId) => {
      const {
        innerRadius: innerRadiusParam,
        outerRadius: outerRadiusParam,
        arcLabelRadius: arcLabelRadiusParam,
        cornerRadius,
        paddingAngle,
        arcLabel,
        arcLabelMinAngle,
        data,
        cx: cxParam,
        cy: cyParam,
        highlightScope
      } = series[seriesId];
      const outerRadius = getPercentageValue(outerRadiusParam != null ? outerRadiusParam : availableRadius, availableRadius);
      const innerRadius = getPercentageValue(innerRadiusParam != null ? innerRadiusParam : 0, availableRadius);
      const arcLabelRadius = arcLabelRadiusParam === void 0 ? (outerRadius + innerRadius) / 2 : getPercentageValue(arcLabelRadiusParam, availableRadius);
      const cx = getPercentageValue(cxParam != null ? cxParam : "50%", width);
      const cy = getPercentageValue(cyParam != null ? cyParam : "50%", height);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("g", {
        transform: `translate(${left + cx}, ${top + cy})`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(PieArcLabelPlot, {
          innerRadius,
          outerRadius: outerRadius != null ? outerRadius : availableRadius,
          arcLabelRadius,
          cornerRadius,
          paddingAngle,
          id: seriesId,
          data,
          skipAnimation,
          arcLabel,
          arcLabelMinAngle,
          highlightScope
        })
      }, seriesId);
    })]
  });
}
const defaultMargin = {
  top: 5,
  bottom: 5,
  left: 5,
  right: 100
};
function PieChart(props) {
  const {
    xAxis,
    yAxis,
    series,
    width,
    height,
    margin: marginProps,
    colors,
    sx,
    tooltip = {
      trigger: "item"
    },
    axisHighlight = {
      x: "none",
      y: "none"
    },
    skipAnimation,
    legend = {
      direction: "column",
      position: {
        vertical: "middle",
        horizontal: "right"
      }
    },
    topAxis = null,
    leftAxis = null,
    rightAxis = null,
    bottomAxis = null,
    children,
    slots,
    slotProps,
    onClick
  } = props;
  const margin = _extends({}, defaultMargin, marginProps);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ResponsiveChartContainer, {
    series: series.map((s2) => _extends({
      type: "pie"
    }, s2)),
    width,
    height,
    margin,
    xAxis: xAxis != null ? xAxis : [{
      id: DEFAULT_X_AXIS_KEY,
      scaleType: "point",
      data: [...new Array(Math.max(...series.map((s2) => s2.data.length)))].map((_, index) => index)
    }],
    yAxis,
    colors,
    sx,
    disableAxisListener: (tooltip == null ? void 0 : tooltip.trigger) !== "axis" && (axisHighlight == null ? void 0 : axisHighlight.x) === "none" && (axisHighlight == null ? void 0 : axisHighlight.y) === "none",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxis, {
      topAxis,
      leftAxis,
      rightAxis,
      bottomAxis,
      slots,
      slotProps
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(PiePlot, {
      slots,
      slotProps,
      onClick,
      skipAnimation
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsLegend, _extends({}, legend, {
      slots,
      slotProps
    })), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsAxisHighlight, _extends({}, axisHighlight)), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartsTooltip, _extends({}, tooltip)), children]
  });
}
export {
  BarChart as B,
  LineChart as L,
  PieChart as P,
  ResponsiveChartContainer as R,
  BarPlot as a,
  LinePlot as b,
  PiePlot as c
};
