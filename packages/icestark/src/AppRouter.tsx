import React from "react";

export interface AppRouterProps {
  children: React.ReactNode;
}

interface AppRouterState {}

export default class AppRouter extends React.Component<
  React.PropsWithChildren<AppRouterProps>,
  AppRouterState
> {
  static defaultProps = {};

  constructor(props: AppRouterProps) {
    super(props);
    this.state = {
      url: "",
      appLoading: "",
    };
  }

  render() {
    const { children } = this.props;
    return <div>{children}</div>;
  }
}
