"use client";

import { forwardRef, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSettings } from '@/lib/SettingsContext';

interface ChartConfig {
  chartType: string;
  encodings: any;
  echartsOption: any;
}

interface Props {
  config: ChartConfig;
  data: any[];
}

const EChartRenderer = forwardRef<any, Props>(({ config, data }, ref) => {
  const { darkMode } = useSettings();
  const theme = darkMode ? 'dark' : 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<any>(null);

  // Resolve actual ref (forwarded or internal)
  const getRef = () => {
    if (ref && typeof ref === 'object' && 'current' in ref) return ref;
    return internalRef;
  };

  const textColor = theme === 'light' ? '#1e293b' : '#a3a3a3';
  const lineColor = theme === 'light' ? '#e2e8f0' : '#262626';

  const applyThemeToAxis = (axis: any): any => {
    if (!axis) return axis;
    if (Array.isArray(axis)) {
      return axis.map(a => applyThemeToAxis(a));
    }
    return {
      ...axis,
      axisLabel: {
        color: textColor,
        ...axis.axisLabel,
      },
      axisLine: {
        ...axis.axisLine,
        lineStyle: {
          color: lineColor,
          ...axis.axisLine?.lineStyle,
        }
      },
      splitLine: {
        ...axis.splitLine,
        lineStyle: {
          color: lineColor,
          ...axis.splitLine?.lineStyle,
        }
      }
    };
  };

  // Merge user provided ECharts option with the dataset source and theme styling
  const finalOption = {
    ...config.echartsOption,
    textStyle: {
      color: textColor,
      ...config.echartsOption?.textStyle,
    },
    xAxis: applyThemeToAxis(config.echartsOption?.xAxis),
    yAxis: applyThemeToAxis(config.echartsOption?.yAxis),
    legend: config.echartsOption?.legend ? {
      ...config.echartsOption.legend,
      textStyle: {
        color: textColor,
        ...config.echartsOption.legend.textStyle
      }
    } : undefined,
    dataset: {
      source: data
    },
    // We assume the echartsOption already defines series correctly, 
    // or we inject it dynamically based on chartType and encodings
    series: config.echartsOption?.series || (config.chartType && config.chartType !== 'custom' ? [{
      type: config.chartType,
      encode: {
        x: config.encodings?.x,
        y: config.encodings?.y
      }
    }] : [])
  };

  // ResizeObserver: whenever the container dimensions change, tell ECharts to resize.
  // This ensures all chart elements (legend, datazoom, axis labels, title) scale properly.
  useEffect(() => {
    const activeRef = getRef();
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      try {
        const echartsInstance = activeRef.current?.getEchartsInstance?.();
        if (echartsInstance && !echartsInstance.isDisposed()) {
          echartsInstance.resize();
        }
      } catch {
        // instance might not be ready yet
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <ReactECharts
        ref={(r) => {
          // Forward to both our internal ref and the external forwarded ref
          internalRef.current = r;
          if (ref && typeof ref === 'object' && 'current' in ref) {
            (ref as React.MutableRefObject<any>).current = r;
          } else if (typeof ref === 'function') {
            ref(r);
          }
        }}
        option={finalOption}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
});

EChartRenderer.displayName = "EChartRenderer";
export default EChartRenderer;
