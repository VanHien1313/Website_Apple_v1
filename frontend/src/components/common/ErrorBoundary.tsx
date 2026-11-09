import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-bold">Không thể hiển thị trang</h1>
        <p>Vui lòng tải lại để tiếp tục.</p>
        <button className="underline" onClick={() => window.location.reload()}>Tải lại trang</button>
      </div>
    );
    return this.props.children;
  }
}
