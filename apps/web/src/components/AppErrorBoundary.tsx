import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RunGoal render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-state">
          <div className="fatal-state__mark">RG</div>
          <p className="eyebrow">页面暂时走神了</p>
          <h1>刷新一下，继续向前</h1>
          <p>你的跑步记录没有受到影响。</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
