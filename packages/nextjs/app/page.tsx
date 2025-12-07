"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
// Not: Kullanılmayan importlar kaldırıldı.

/**
 * Site main page: displays contract info and betting interface
 */
const Home = () => {
  // Contract Read Hooks
  const { data: currentOutcome } = useScaffoldReadContract({
    contractName: "BettingContract",
    functionName: "currentOutcome",
  });
  const { data: contractBalance } = useScaffoldReadContract({
    contractName: "BettingContract",
    functionName: "getContractBalance",
  });

  // Contract Read: Total Bets for Team A (1)
  const { data: totalBetsTeamA } = useScaffoldReadContract({
    contractName: "BettingContract",
    functionName: "totalBetsForOutcome",
    args: [1n as const], // <-- HATA DÜZELTİLDİ: Number (1) yerine BigInt (1n) kullanıldı.
  });

  // Helper function to convert Outcome enum value to a readable string
  const outcomeToString = (outcome: bigint | undefined): string => {
    if (outcome === undefined) return "Загрузка...";
    // HATA DÜZELTİLDİ: Number() dönüşümü kaldırıldı, BigInt değerleriyle karşılaştırıldı.
    switch (outcome) {
      case 0n:
        return "Ожидание (PENDING)";
      case 1n:
        return "Команда А Победила";
      case 2n:
        return "Команда Б Победила";
      case 3n:
        return "Ничья (DRAW)";
      default:
        return "Неизвестный результат";
    }
  };

  // Helper function for BigNumber to ETH formatting (for totalBets read)
  const formatWeiToEth = (wei: bigint | undefined) => {
    if (wei === undefined || wei === 0n) return "0 ETH";
    return `${formatEther(wei)} ETH`;
  };

  // Arayüzün görüntülendiği kısım
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">Децентрализованная Система Ставок</span>
          <span className="block text-2xl font-semibold mt-2">Dapp для заключения пари</span>
        </h1>
        <p className="text-center text-lg mt-4">
          Текущий результат: <span className="font-bold text-primary">{outcomeToString(currentOutcome)}</span>
        </p>
        <p className="text-center text-lg">
          Общий баланс контракта: <span className="font-bold text-primary">{formatWeiToEth(contractBalance)}</span>
        </p>
      </div>

      <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-sm rounded-3xl">
            <h2 className="text-xl font-bold mb-4">Статистика Ставок</h2>
            <p className="text-base">
              Сумма ставок на &apos;Команда А&apos;: <span className="font-bold">{formatWeiToEth(totalBetsTeamA)}</span>
            </p>
            <p className="mt-4 text-warning">
              Для размещения ставок и объявления результатов используйте вкладку **Debug Contracts**.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;