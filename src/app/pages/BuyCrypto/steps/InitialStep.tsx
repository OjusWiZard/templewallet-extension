import React, { ChangeEvent, FC, useEffect, useState } from 'react';

import BigNumber from 'bignumber.js';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';

import Divider from 'app/atoms/Divider';
import FormSubmitButton from 'app/atoms/FormSubmitButton';
import { TopUpInput } from 'app/atoms/TopUpInput/TopUpInput';
import styles from 'app/pages/BuyCrypto/BuyCrypto.module.css';
import ErrorComponent from 'app/pages/BuyCrypto/steps/ErrorComponent';
import WarningComponent from 'app/pages/BuyCrypto/steps/WarningComponent';
import { ExchangeDataInterface, ExchangeDataStatusEnum, getRate, submitExchange } from 'lib/exolix-api';
import { useAssetFiatCurrencyPrice } from 'lib/fiat-curency';
import { T } from 'lib/i18n/react';
import { useAccount } from 'lib/temple/front';

import { BuyCryptoSelectors } from '../BuyCrypto.selectors';

const coinTo = 'XTZ';
const maxDollarValue = 10000;
const avgCommission = 300;

interface Props {
  exchangeData: ExchangeDataInterface | null;
  setExchangeData: (exchangeData: ExchangeDataInterface | null) => void;
  setStep: (step: number) => void;
  isError: boolean;
  setIsError: (error: boolean) => void;
}

const InitialStep: FC<Props> = ({ exchangeData, setExchangeData, setStep, isError, setIsError }) => {
  const [maxAmount, setMaxAmount] = useState('');
  const [amount, setAmount] = useState(0);
  const [coinFrom, setCoinFrom] = useState('BTC');
  const [lastMinAmount, setLastMinAmount] = useState(new BigNumber(0));
  const [lastMaxAmount, setLastMaxAmount] = useState('0');
  const [isCurrencyAvailable, setIsCurrencyAvailable] = useState(true);

  const [depositAmount, setDepositAmount] = useState(0);
  const { publicKeyHash } = useAccount();
  const [disabledProceed, setDisableProceed] = useState(true);
  const [debouncedAmount] = useDebounce(amount, 500);
  const tezPrice = useAssetFiatCurrencyPrice('tez');

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDisableProceed(true);
    setAmount(Number(e.target.value));
  };

  const submitExchangeHandler = async () => {
    try {
      const data = await submitExchange({
        coinFrom,
        coinTo,
        amount,
        withdrawalAddress: publicKeyHash,
        withdrawalExtraId: ''
      });
      setExchangeData(data);
      if (data.status === ExchangeDataStatusEnum.WAIT) {
        setStep(1);
      } else if (data.status === ExchangeDataStatusEnum.CONFIRMATION) {
        setStep(2);
      } else if (data.status === ExchangeDataStatusEnum.EXCHANGING) {
        setStep(3);
      }
    } catch (e) {
      setIsError(true);
    }
  };
  const { data: rates = { toAmount: 0, rate: 0, minAmount: 0 } } = useSWR(
    ['/api/currency', coinTo, coinFrom, amount],
    () => getRate({ coinFrom, coinTo, amount })
  );

  useEffect(() => {
    (async () => {
      try {
        setIsCurrencyAvailable(true);

        const { rate, ...rest } = await getRate({
          coinFrom: coinTo,
          coinTo: coinFrom,
          amount: (maxDollarValue + avgCommission) / tezPrice!
        });

        setMaxAmount(new BigNumber(rest.toAmount).toFixed(Number(rest.toAmount) > 100 ? 2 : 6));
      } catch (e) {
        setIsCurrencyAvailable(false);
      }
    })();
  }, [coinFrom, tezPrice]);

  const isMinAmountError = amount !== 0 && (lastMinAmount ? lastMinAmount.toNumber() : 0) > Number(amount);

  const isMaxAmountError =
    lastMaxAmount !== 'Infinity' && debouncedAmount !== 0 && Number(debouncedAmount) > Number(lastMaxAmount);

  useEffect(() => {
    setDepositAmount(rates.toAmount);
    if (amount === 0) {
      setDisableProceed(true);
    } else if (rates.minAmount === 0) {
      setDisableProceed(true);
    } else if (rates.minAmount > amount) {
      setDisableProceed(true);
    } else if (rates.toAmount === 0) {
      setDisableProceed(true);
    } else {
      setDisableProceed(false);
    }
    if (rates.minAmount > 0) {
      setLastMinAmount(new BigNumber(rates.minAmount));
    }
    if (maxAmount !== 'Infinity') {
      setLastMaxAmount(maxAmount);
    } else {
      setLastMaxAmount('---');
    }
    if (isMaxAmountError) {
      setDisableProceed(true);
    }
  }, [rates, amount, maxAmount, isMaxAmountError, coinFrom]);

  return (
    <>
      {!isError ? (
        <>
          <p className={styles['title']}>
            <T id={'exchangeDetails'} />
          </p>
          <p className={styles['description']}>
            <T id={'exchangeDetailsDescription'} />
          </p>
          <WarningComponent currency={coinFrom} />
          <Divider style={{ marginTop: '60px', marginBottom: '10px' }} />
          {/*input 1*/}
          <TopUpInput
            currency={coinFrom}
            setCurrency={setCoinFrom}
            type="coinFrom"
            onChangeInputHandler={onAmountChange}
            rates={rates}
            maxAmount={lastMaxAmount}
            isMinAmountError={isMinAmountError}
            isMaxAmountError={isMaxAmountError}
            isCurrencyAvailable={isCurrencyAvailable}
          />
          <br />
          <TopUpInput readOnly={true} value={depositAmount} currency={coinTo} type="coinTo" />
          <Divider style={{ marginTop: '40px', marginBottom: '20px' }} />
          <div className={styles['exchangeRateBlock']}>
            <p className={styles['exchangeTitle']}>
              <T id={'exchangeRate'} />
            </p>
            <p className={styles['exchangeData']}>
              1 {coinFrom} = {rates.rate} {coinTo}
            </p>
          </div>
          <FormSubmitButton
            className="w-full justify-center border-none"
            style={{
              padding: '10px 2rem',
              background: '#4299e1',
              marginTop: '24px'
            }}
            onClick={submitExchangeHandler}
            disabled={disabledProceed}
            testID={BuyCryptoSelectors.TopupFirstStepSubmit}
          >
            <T id={'topUp'} />
          </FormSubmitButton>
          <p className={styles['privacyAndPolicy']}>
            <T
              id="privacyAndPolicyLinks"
              substitutions={[
                <T id={'topUp'} />,
                <a className={styles['link']} rel="noreferrer" href="https://exolix.com/terms" target="_blank">
                  <T id={'termsOfUse'} />
                </a>,
                <a className={styles['link']} rel="noreferrer" href="https://exolix.com/privacy" target="_blank">
                  <T id={'privacyPolicy'} />
                </a>
              ]}
            />
          </p>
        </>
      ) : (
        <ErrorComponent
          exchangeData={exchangeData}
          setIsError={setIsError}
          setExchangeData={setExchangeData}
          setStep={setStep}
        />
      )}
    </>
  );
};

export default InitialStep;
