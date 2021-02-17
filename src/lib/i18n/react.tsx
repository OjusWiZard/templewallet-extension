import * as React from "react";
import { Substitutions } from "./types";
import { toList } from "./helpers";
import { getMessage } from "./core";

export * from "./index";

export type ReactSubstitutions = React.ReactNode | React.ReactNode[];

export type TProps = {
  id: string;
  substitutions?: any;
  children?: (m: React.ReactNode | string | null) => React.ReactElement;
};

export const T: React.FC<TProps> = ({ id, substitutions, children }) => {
  const message = React.useMemo(
    () => t(id, substitutions ? [...substitutions, <></>] : [<></>]),
    [id, substitutions]
  );

  return React.useMemo(() => (children ? children(message) : <>{message}</>), [
    message,
    children,
  ]);
};

export function t(messageName: string, substitutions?: Substitutions): string;
export function t(
  messageName: string,
  substitutions?: ReactSubstitutions
): React.ReactNode;
export function t(messageName: string, substitutions?: any): any {
  if (!substitutions || !hasReactSubstitutions(substitutions)) {
    return getMessage(messageName, substitutions);
  }

  const subList = toList(substitutions);
  const tmp = getMessage(
    messageName,
    subList.map(() => "$$")
  );

  return (
    <>
      {tmp.split("$$").map((partI, i) => (
        <React.Fragment key={`i_${i}`}>
          {partI.split("\n").map((partJ, j) => (
            <React.Fragment key={`j_${j}`}>
              {j > 0 && <br />}
              {partJ.includes("<b>")
                ? partJ
                    .split(BOLD_PATTERN)
                    .map((partK, k) => (
                      <React.Fragment key={`k_${k}`}>
                        {k % 2 === 0 ? (
                          partK
                        ) : (
                          <span className="font-semibold">{partK}</span>
                        )}
                      </React.Fragment>
                    ))
                : partJ}
            </React.Fragment>
          ))}
          {subList[i]}
        </React.Fragment>
      ))}
    </>
  );
}

const BOLD_PATTERN = /<b>(.*?)<\/b>/g;

function hasReactSubstitutions(
  substitutions: Substitutions | ReactSubstitutions
): substitutions is ReactSubstitutions {
  return Array.isArray(substitutions)
    ? substitutions.some(isReactSubstitution)
    : isReactSubstitution(substitutions);
}

function isReactSubstitution(sub: any) {
  return sub !== null && (typeof sub === "function" || typeof sub === "object");
}
