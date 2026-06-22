"use client";

import { forwardRef, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSettings } from '@/lib/SettingsContext';
import DOMPurify from 'dompurify';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ECharts Rendering Error caught:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center text-center p-4 h-full w-full bg-neutral-900/50 rounded-lg border border-dashed border-red-500/40 text-neutral-300">
          <svg className="w-8 h-8 text-red-500/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs font-semibold text-red-400">Lỗi hiển thị biểu đồ</p>
          <p className="text-[10px] text-neutral-500 mt-1 max-w-[240px] truncate">
            {this.state.error?.message || "ECharts render failed."}
          </p>
          <p className="text-[9px] text-neutral-600 mt-1">Nhấp vào biểu tượng sửa để kiểm tra lại cấu hình ECharts.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ChartConfig {
  chartType: string;
  encodings: any;
  echartsOption: any;
  events?: Record<string, Function>;
  htmlOverlay?: string | ReactNode;
}

interface Props {
  config: ChartConfig;
  data: any[];
}

const EChartRendererImpl = forwardRef<any, Props>(({ config, data }, ref) => {
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

  const renderHtmlOverlay = () => {
    if (!config.htmlOverlay) return null;

    if (typeof config.htmlOverlay === 'string') {
      return (
        <div 
          className="echarts-html-overlay"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(config.htmlOverlay) }}
        />
      );
    }

    return (
      <div 
        className="echarts-html-overlay"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {config.htmlOverlay}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', position: 'relative' }}>
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
        onEvents={config.events}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
      {renderHtmlOverlay()}
    </div>
  );
});

const EChartRenderer = forwardRef<any, Props>((props, ref) => (
  <ChartErrorBoundary>
    <EChartRendererImpl {...props} ref={ref} />
  </ChartErrorBoundary>
));

EChartRenderer.displayName = "EChartRenderer";
export default EChartRenderer;
