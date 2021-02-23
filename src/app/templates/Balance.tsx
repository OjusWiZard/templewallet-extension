import * as React from "react";
import classNames from "clsx";
import BigNumber from "bignumber.js";
import CSSTransition from "react-transition-group/CSSTransition";
import { TempleAsset, TEZ_ASSET, useBalance } from "lib/temple/front";

type BalanceProps = {
  address: string;
  children: (b: BigNumber) => React.ReactElement;
  asset?: TempleAsset;
  networkRpc?: string;
  displayed?: boolean;
};

const Balance = React.memo<BalanceProps>(
  ({ address, children, asset = TEZ_ASSET, networkRpc, displayed }) => {
    const { data: balance } = useBalance(asset, address, {
      networkRpc,
      suspense: false,
      displayed,
    });
    const exist = balance !== undefined;

    return React.useMemo(() => {
      const childNode = children(exist ? balance! : new BigNumber(0));

      return (
        <CSSTransition
          in={exist}
          timeout={200}
          classNames={{
            enter: "opacity-0",
            enterActive: classNames(
              "opacity-100",
              "transition ease-out duration-200"
            ),
            exit: classNames("opacity-0", "transition ease-in duration-200"),
          }}
        >
          {React.cloneElement(childNode, {
            className: classNames(
              childNode.props.className,
              !exist && "invisible"
            ),
          })}
        </CSSTransition>
      );
    }, [children, exist, balance]);
  }
);

export default Balance;
