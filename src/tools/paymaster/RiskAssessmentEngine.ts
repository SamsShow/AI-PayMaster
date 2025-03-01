import { LocalSigner } from "move-agent-kit";
import { AptosAccount, Network } from "@aptos-labs/ts-sdk";

// Risk assessment types
export interface LiquidityRisk {
  requiredLiquidity: string;
  availableLiquidity: string;
  liquidityRatio: number; // Percentage (0-100)
  riskLevel: string;
  timeUntilNextPayment: number; // Seconds
}

export interface CollateralRisk {
  borrowedAmount: string;
  collateralAmount: string;
  collateralRatio: number; // Percentage (0-200+%)
  riskLevel: string;
  liquidationThreshold: number; // Percentage
}

export interface LiquidationRisk {
  protocol: string;
  position: string;
  currentPrice: string;
  liquidationPrice: string;
  priceGap: number; // Percentage
  estimatedTimeToLiquidation: number; // Seconds (based on price movement)
  riskLevel: string;
}

export interface RiskAssessment {
  liquidityRisk: LiquidityRisk | null;
  collateralRisk: CollateralRisk | null;
  liquidationRisk: LiquidationRisk | null;
  overallRiskLevel: string;
  recommendedActions: string[];
}

export class RiskAssessmentEngine {
  // Risk level thresholds
  private readonly LIQUIDITY_MEDIUM_THRESHOLD = 80; // 80% of required
  private readonly LIQUIDITY_HIGH_THRESHOLD = 50; // 50% of required
  private readonly LIQUIDITY_CRITICAL_THRESHOLD = 20; // 20% of required

  private readonly COLLATERAL_MEDIUM_THRESHOLD = 150; // 150% collateral ratio
  private readonly COLLATERAL_HIGH_THRESHOLD = 125; // 125% collateral ratio
  private readonly COLLATERAL_CRITICAL_THRESHOLD = 110; // 110% collateral ratio

  private readonly LIQUIDATION_MEDIUM_THRESHOLD = 7 * 86400; // 7 days
  private readonly LIQUIDATION_HIGH_THRESHOLD = 3 * 86400; // 3 days
  private readonly LIQUIDATION_CRITICAL_THRESHOLD = 1 * 86400; // 1 day

  private mockData: {
    payments: any[];
    positions: any[];
    prices: Record<string, number>;
    priceMovements: Record<string, number>; // Daily percentage change
  };

  constructor() {
    // Mock data for demonstration - in a real implementation, this would be fetched from the blockchain
    this.mockData = {
      payments: [
        {
          id: 1,
          recipient: "0x123",
          amount: "100",
          nextPaymentTime: Date.now() / 1000 + 86400 * 2, // 2 days from now
          coin: "0x1::aptos_coin::AptosCoin",
        },
        {
          id: 2,
          recipient: "0x456",
          amount: "50",
          nextPaymentTime: Date.now() / 1000 + 86400 * 5, // 5 days from now
          coin: "0x1::usdc::USDC",
        },
      ],
      positions: [
        {
          protocol: "Aries",
          borrowedAsset: "USDC",
          borrowedAmount: "1000",
          collateralAsset: "APT",
          collateralAmount: "50",
          liquidationThreshold: 125, // 125%
        },
        {
          protocol: "Momentum",
          borrowedAsset: "USDT",
          borrowedAmount: "500",
          collateralAsset: "APT",
          collateralAmount: "35",
          liquidationThreshold: 110, // 110%
        },
      ],
      prices: {
        APT: 10,
        USDC: 1,
        USDT: 1,
      },
      priceMovements: {
        APT: -2.5, // 2.5% daily decrease
        USDC: 0,
        USDT: 0,
      },
    };
  }

  /**
   * Set custom risk thresholds
   */
  setRiskThresholds(
    liquidityThresholds?: { medium: number; high: number; critical: number },
    collateralThresholds?: { medium: number; high: number; critical: number },
    liquidationThresholds?: { medium: number; high: number; critical: number }
  ): void {
    if (liquidityThresholds) {
      this.LIQUIDITY_MEDIUM_THRESHOLD = liquidityThresholds.medium;
      this.LIQUIDITY_HIGH_THRESHOLD = liquidityThresholds.high;
      this.LIQUIDITY_CRITICAL_THRESHOLD = liquidityThresholds.critical;
    }

    if (collateralThresholds) {
      this.COLLATERAL_MEDIUM_THRESHOLD = collateralThresholds.medium;
      this.COLLATERAL_HIGH_THRESHOLD = collateralThresholds.high;
      this.COLLATERAL_CRITICAL_THRESHOLD = collateralThresholds.critical;
    }

    if (liquidationThresholds) {
      this.LIQUIDATION_MEDIUM_THRESHOLD = liquidationThresholds.medium;
      this.LIQUIDATION_HIGH_THRESHOLD = liquidationThresholds.high;
      this.LIQUIDATION_CRITICAL_THRESHOLD = liquidationThresholds.critical;
    }
  }

  /**
   * Assess liquidity risk
   * @param availableLiquidity Available liquidity in the account
   * @returns Liquidity risk assessment
   */
  assessLiquidityRisk(availableLiquidity: string): LiquidityRisk | null {
    const availableLiquidityNum = parseFloat(availableLiquidity);

    // Calculate total required liquidity for upcoming payments
    let requiredLiquidity = 0;
    let nextPaymentTime = Number.MAX_SAFE_INTEGER;

    this.mockData.payments.forEach((payment) => {
      if (payment.coin === "0x1::aptos_coin::AptosCoin") {
        requiredLiquidity += parseFloat(payment.amount);
        if (payment.nextPaymentTime < nextPaymentTime) {
          nextPaymentTime = payment.nextPaymentTime;
        }
      }
    });

    if (requiredLiquidity === 0) {
      return null; // No upcoming payments that require liquidity
    }

    // Calculate liquidity ratio (as percentage)
    const liquidityRatio = Math.min(
      100,
      (availableLiquidityNum / requiredLiquidity) * 100
    );

    // Determine risk level
    let riskLevel = "Low";
    if (liquidityRatio <= this.LIQUIDITY_CRITICAL_THRESHOLD) {
      riskLevel = "Critical";
    } else if (liquidityRatio <= this.LIQUIDITY_HIGH_THRESHOLD) {
      riskLevel = "High";
    } else if (liquidityRatio <= this.LIQUIDITY_MEDIUM_THRESHOLD) {
      riskLevel = "Medium";
    }

    // Calculate time until next payment
    const timeUntilNextPayment = nextPaymentTime - Date.now() / 1000;

    return {
      requiredLiquidity: requiredLiquidity.toString(),
      availableLiquidity,
      liquidityRatio,
      riskLevel,
      timeUntilNextPayment,
    };
  }

  /**
   * Assess collateral risk
   * @returns Collateral risk assessment
   */
  assessCollateralRisk(): CollateralRisk | null {
    if (this.mockData.positions.length === 0) {
      return null; // No active positions
    }

    // Find the riskiest position
    let riskiestPosition = null;
    let lowestCollateralRatio = Number.MAX_SAFE_INTEGER;

    for (const position of this.mockData.positions) {
      const borrowedAmount = parseFloat(position.borrowedAmount);
      const collateralAmount = parseFloat(position.collateralAmount);
      const borrowedValue =
        borrowedAmount * this.mockData.prices[position.borrowedAsset];
      const collateralValue =
        collateralAmount * this.mockData.prices[position.collateralAsset];

      const collateralRatio = (collateralValue / borrowedValue) * 100;

      if (collateralRatio < lowestCollateralRatio) {
        lowestCollateralRatio = collateralRatio;
        riskiestPosition = position;
      }
    }

    if (!riskiestPosition) {
      return null;
    }

    // Determine risk level
    let riskLevel = "Low";
    if (lowestCollateralRatio <= this.COLLATERAL_CRITICAL_THRESHOLD) {
      riskLevel = "Critical";
    } else if (lowestCollateralRatio <= this.COLLATERAL_HIGH_THRESHOLD) {
      riskLevel = "High";
    } else if (lowestCollateralRatio <= this.COLLATERAL_MEDIUM_THRESHOLD) {
      riskLevel = "Medium";
    }

    return {
      borrowedAmount: riskiestPosition.borrowedAmount,
      collateralAmount: riskiestPosition.collateralAmount,
      collateralRatio: lowestCollateralRatio,
      riskLevel,
      liquidationThreshold: riskiestPosition.liquidationThreshold,
    };
  }

  /**
   * Assess liquidation risk
   * @returns Liquidation risk assessment
   */
  assessLiquidationRisk(): LiquidationRisk | null {
    if (this.mockData.positions.length === 0) {
      return null; // No active positions
    }

    // Find the position closest to liquidation
    let riskiestPosition = null;
    let shortestTimeToLiquidation = Number.MAX_SAFE_INTEGER;
    let closestLiquidationDetails = null;

    for (const position of this.mockData.positions) {
      const borrowedAmount = parseFloat(position.borrowedAmount);
      const collateralAmount = parseFloat(position.collateralAmount);
      const borrowedValue =
        borrowedAmount * this.mockData.prices[position.borrowedAsset];
      const collateralValue =
        collateralAmount * this.mockData.prices[position.collateralAsset];

      const currentRatio = (collateralValue / borrowedValue) * 100;
      const liquidationThreshold = position.liquidationThreshold;

      // Calculate liquidation price of the collateral asset
      const liquidationPrice =
        (borrowedValue * liquidationThreshold) / 100 / collateralAmount;
      const currentPrice = this.mockData.prices[position.collateralAsset];
      const priceGap = ((currentPrice - liquidationPrice) / currentPrice) * 100;

      // Estimate time to liquidation based on price movement
      const dailyPriceChange =
        this.mockData.priceMovements[position.collateralAsset];

      let estimatedTimeToLiquidation;
      if (dailyPriceChange >= 0 || priceGap <= 0) {
        // Price is increasing or already below liquidation threshold
        estimatedTimeToLiquidation =
          priceGap <= 0 ? 0 : Number.MAX_SAFE_INTEGER;
      } else {
        // Calculate how many days until price reaches liquidation price
        const daysToLiquidation = priceGap / Math.abs(dailyPriceChange);
        estimatedTimeToLiquidation = daysToLiquidation * 86400; // Convert to seconds
      }

      if (estimatedTimeToLiquidation < shortestTimeToLiquidation) {
        shortestTimeToLiquidation = estimatedTimeToLiquidation;
        riskiestPosition = position;
        closestLiquidationDetails = {
          currentPrice: currentPrice.toString(),
          liquidationPrice: liquidationPrice.toString(),
          priceGap,
        };
      }
    }

    if (!riskiestPosition || !closestLiquidationDetails) {
      return null;
    }

    // Determine risk level
    let riskLevel = "Low";
    if (shortestTimeToLiquidation <= this.LIQUIDATION_CRITICAL_THRESHOLD) {
      riskLevel = "Critical";
    } else if (shortestTimeToLiquidation <= this.LIQUIDATION_HIGH_THRESHOLD) {
      riskLevel = "High";
    } else if (shortestTimeToLiquidation <= this.LIQUIDATION_MEDIUM_THRESHOLD) {
      riskLevel = "Medium";
    }

    return {
      protocol: riskiestPosition.protocol,
      position: `${riskiestPosition.borrowedAmount} ${riskiestPosition.borrowedAsset} borrowed against ${riskiestPosition.collateralAmount} ${riskiestPosition.collateralAsset}`,
      currentPrice: closestLiquidationDetails.currentPrice,
      liquidationPrice: closestLiquidationDetails.liquidationPrice,
      priceGap: closestLiquidationDetails.priceGap,
      estimatedTimeToLiquidation: shortestTimeToLiquidation,
      riskLevel,
    };
  }

  /**
   * Get risk assessment recommendations
   * @param assessment Risk assessment data
   * @returns List of recommended actions
   */
  private getRecommendations(assessment: RiskAssessment): string[] {
    const recommendations: string[] = [];

    // Liquidity risk recommendations
    if (assessment.liquidityRisk) {
      const { liquidityRatio, requiredLiquidity, timeUntilNextPayment } =
        assessment.liquidityRisk;

      if (liquidityRatio < 100) {
        const shortfall =
          parseFloat(requiredLiquidity) * (1 - liquidityRatio / 100);
        recommendations.push(
          `Add ${shortfall.toFixed(
            2
          )} APT to cover upcoming payment obligations.`
        );
      }

      if (timeUntilNextPayment < 86400 && liquidityRatio < 100) {
        recommendations.push(
          "Urgent: Payment due in less than 24 hours with insufficient funds."
        );
      }
    }

    // Collateral risk recommendations
    if (assessment.collateralRisk) {
      const { collateralRatio, liquidationThreshold } =
        assessment.collateralRisk;

      if (collateralRatio < liquidationThreshold * 1.2) {
        recommendations.push(
          "Consider adding more collateral to your position to create a safer buffer."
        );
      }

      if (collateralRatio < liquidationThreshold * 1.1) {
        recommendations.push(
          "Warning: Collateral ratio approaching liquidation threshold. Add collateral or repay part of the loan."
        );
      }
    }

    // Liquidation risk recommendations
    if (assessment.liquidationRisk) {
      const { estimatedTimeToLiquidation, priceGap, protocol } =
        assessment.liquidationRisk;

      if (estimatedTimeToLiquidation < 86400 * 3) {
        recommendations.push(
          `Critical: Your ${protocol} position is at high risk of liquidation within 3 days. Add collateral or repay debt immediately.`
        );
      } else if (estimatedTimeToLiquidation < 86400 * 7) {
        recommendations.push(
          `Warning: Your ${protocol} position may face liquidation within a week if market trends continue. Consider risk mitigation.`
        );
      }

      if (priceGap < 10) {
        recommendations.push(
          `Your collateral price is only ${priceGap.toFixed(
            1
          )}% above liquidation price. Consider adding more collateral.`
        );
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Your positions appear stable. Continue monitoring for any changes in market conditions."
      );
    }

    return recommendations;
  }

  /**
   * Perform comprehensive risk assessment
   * @param availableLiquidity Available liquidity in the account
   * @returns Complete risk assessment
   */
  performRiskAssessment(availableLiquidity: string): RiskAssessment {
    // Assess individual risk factors
    const liquidityRisk = this.assessLiquidityRisk(availableLiquidity);
    const collateralRisk = this.assessCollateralRisk();
    const liquidationRisk = this.assessLiquidationRisk();

    // Determine overall risk level
    let overallRiskLevel = "Low";
    const riskLevels = [
      liquidityRisk?.riskLevel,
      collateralRisk?.riskLevel,
      liquidationRisk?.riskLevel,
    ].filter(Boolean);

    if (riskLevels.includes("Critical")) {
      overallRiskLevel = "Critical";
    } else if (riskLevels.includes("High")) {
      overallRiskLevel = "High";
    } else if (riskLevels.includes("Medium")) {
      overallRiskLevel = "Medium";
    }

    // Create complete assessment
    const assessment: RiskAssessment = {
      liquidityRisk,
      collateralRisk,
      liquidationRisk,
      overallRiskLevel,
      recommendedActions: [],
    };

    // Generate recommendations
    assessment.recommendedActions = this.getRecommendations(assessment);

    return assessment;
  }

  /**
   * Update mock data for testing (would be replaced with real data in production)
   */
  updateMockData(data: Partial<typeof this.mockData>): void {
    this.mockData = {
      ...this.mockData,
      ...data,
    };
  }
}
