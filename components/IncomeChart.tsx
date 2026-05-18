import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Polygon, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useMemo } from 'react';
import { useTheme } from '../src/theme';
import { formatCurrencyShort } from '../src/utils/formatters';
import type { IncomeDataPoint } from '../src/types';

interface IncomeChartProps {
  data: IncomeDataPoint[];
}

const H = 200;
const PL = 30;
const PR = 6;
const PT = 16;
const PB = 22;

export default function IncomeChart({ data }: IncomeChartProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { marginTop: 10 },
    empty: { textAlign: 'center', fontSize: 14, color: colors.textSecondary, paddingVertical: 20 },
  }), [colors]);

  const { linePoints, areaPoints, points, yLabels, xLabels } = useMemo(() => {
    if (data.length === 0) return { linePoints: '', areaPoints: '', points: [], yLabels: [], xLabels: [] };

    const w = 320;
    const drawW = w - PL - PR;
    const drawH = H - PT - PB;
    const max = Math.max(...data.map(d => d.amount), 1);
    const stepX = drawW / (data.length - 1 || 1);

    const pts = data.map((d, i) => ({
      x: PL + i * stepX,
      y: PT + drawH - (d.amount / max) * drawH,
      amount: d.amount,
      label: d.label,
    }));

    const line = pts.map(p => `${p.x},${p.y}`).join(' ');
    const baseY = PT + drawH;
    const area = `${pts[0].x},${baseY} ${pts.map(p => `${p.x},${p.y}`).join(' ')} ${pts[pts.length - 1].x},${baseY}`;

    const yLbls = [
      { value: max, y: PT },
      { value: Math.round(max / 2), y: PT + drawH / 2 },
      { value: 0, y: PT + drawH },
    ];

    const step = Math.max(1, Math.floor(pts.length / 8));
    const xLbls = pts.map((p, i) => ({
      label: p.label,
      x: p.x,
      show: i === 0 || i === pts.length - 1 || i % step === 0,
    }));

    return { linePoints: line, areaPoints: area, points: pts, yLabels: yLbls, xLabels: xLbls };
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width="100%" height={H} viewBox={`0 0 320 ${H}`}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {yLabels.map((yl, i) => (
          <SvgText
            key={`y${i}`}
            x={PL - 6}
            y={yl.y + 4}
            fill={colors.textTertiary}
            fontSize={10}
            textAnchor="end"
          >
            {formatCurrencyShort(yl.value)}
          </SvgText>
        ))}

        {xLabels.filter(xl => xl.show).map((xl, i) => (
          <SvgText
            key={`x${i}`}
            x={xl.x}
            y={H - 4}
            fill={colors.textTertiary}
            fontSize={10}
            textAnchor="middle"
          >
            {xl.label}
          </SvgText>
        ))}

        {points.map((p, i) => (
          <SvgText
            key={`v${i}`}
            x={p.x}
            y={p.y - 8}
            fill={colors.text}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {formatCurrencyShort(p.amount)}
          </SvgText>
        ))}

        <Polygon points={areaPoints} fill="url(#grad)" />
        <Polyline points={linePoints} fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="3.5" fill={colors.card} stroke={colors.primary} strokeWidth="2" />
        ))}
      </Svg>
    </View>
  );
}