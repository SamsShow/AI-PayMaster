import { LocalSigner } from "move-agent-kit";
import { AptosAccount, Network } from "@aptos-labs/ts-sdk";

// Protocol types
export interface ProtocolInfo {
  id: number;
  name: string;
  currentApy: number;
  riskScore: number; // 1-10 scale where 1 is lowest risk
  minimumDeposit: string;
  lockupPeriod: number; // In seconds
}

// Strategy recommendation type
export interface StrategyRecommendation {
  protocolId: number;
  protocolName: string;
  allocationPercentage: number;
  expectedApy: number;
  riskLevel: string;
  reason: string;
}

export class AIYieldOptimizer {
  private protocols: ProtocolInfo[];
  private userRiskPreference: number; // 1-10 scale where 1 is most conservative

  constructor(userRiskPreference: number = 5) {
    this.userRiskPreference = userRiskPreference;

    // Sample protocol data - in a real implementation this would be fetched from the blockchain
    this.protocols = [
      {
        id: 1, // PROTOCOL_THALA
        name: "Thala",
        currentApy: 5.2,
        riskScore: 3,
        minimumDeposit: "1", // 1 APT
        lockupPeriod: 0, // No lockup
      },
      {
        id: 2, // PROTOCOL_ARIES
        name: "Aries",
        currentApy: 7.8,
        riskScore: 5,
        minimumDeposit: "10", // 10 APT
        lockupPeriod: 86400 * 7, // 7 days
      },
      {
        id: 3, // PROTOCOL_MOMENTUM
        name: "Momentum",
        currentApy: 12.5,
        riskScore: 8,
        minimumDeposit: "100", // 100 APT
        lockupPeriod: 86400 * 30, // 30 days
      },
    ];
  }

  /**
   * Set user risk preference
   * @param riskPreference Risk preference on a 1-10 scale
   */
  setRiskPreference(riskPreference: number): void {
    if (riskPreference < 1 || riskPreference > 10) {
      throw new Error("Risk preference must be between 1 and 10");
    }
    this.userRiskPreference = riskPreference;
  }

  /**
   * Update protocol information (APY, risk score, etc.)
   * @param protocolId Protocol ID
   * @param updates Partial protocol updates
   */
  updateProtocolInfo(protocolId: number, updates: Partial<ProtocolInfo>): void {
    const index = this.protocols.findIndex((p) => p.id === protocolId);
    if (index === -1) {
      throw new Error(`Protocol with ID ${protocolId} not found`);
    }

    this.protocols[index] = {
      ...this.protocols[index],
      ...updates,
    };
  }

  /**
   * Calculate a risk-adjusted APY
   * @param apy The raw APY
   * @param riskScore The risk score (1-10)
   * @returns Risk adjusted APY value
   */
  private calculateRiskAdjustedApy(apy: number, riskScore: number): number {
    // Simple risk adjustment - penalize higher risk more if user is conservative
    const riskPenalty = (riskScore * (11 - this.userRiskPreference)) / 10;
    return apy - riskPenalty;
  }

  /**
   * Get risk level description
   * @param riskScore The risk score (1-10)
   * @returns Risk level description
   */
  private getRiskLevelDescription(riskScore: number): string {
    if (riskScore <= 3) return "Low";
    if (riskScore <= 6) return "Medium";
    return "High";
  }

  /**
   * Optimize portfolio allocation based on user's risk preference
   * @param availableFunds Total available funds to allocate
   * @param emergencyFundsPercentage Percentage to keep as emergency funds (0-100)
   * @returns Recommended allocation strategy
   */
  optimizeAllocation(
    availableFunds: string,
    emergencyFundsPercentage: number = 10
  ): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];
    const availableFundsNumber = parseFloat(availableFunds);

    // Calculate emergency funds
    const emergencyFunds =
      availableFundsNumber * (emergencyFundsPercentage / 100);
    const allocatableFunds = availableFundsNumber - emergencyFunds;

    if (allocatableFunds <= 0) {
      return [];
    }

    // Filter protocols by minimum deposit
    const eligibleProtocols = this.protocols.filter(
      (p) => parseFloat(p.minimumDeposit) <= allocatableFunds
    );

    if (eligibleProtocols.length === 0) {
      return [];
    }

    // Calculate risk-adjusted APYs
    const protocolsWithAdjustedApy = eligibleProtocols.map((p) => ({
      ...p,
      adjustedApy: this.calculateRiskAdjustedApy(p.currentApy, p.riskScore),
    }));

    // Sort by adjusted APY (highest first)
    protocolsWithAdjustedApy.sort((a, b) => b.adjustedApy - a.adjustedApy);

    // Calculate total adjusted APY (for weighted allocation)
    const totalAdjustedApy = protocolsWithAdjustedApy.reduce(
      (sum, p) => sum + p.adjustedApy,
      0
    );

    // Allocate funds based on weighted adjusted APY
    let remainingPercentage = 100;

    protocolsWithAdjustedApy.forEach((protocol, index) => {
      // For the last protocol, assign all remaining percentage
      let allocationPercentage;
      if (index === protocolsWithAdjustedApy.length - 1) {
        allocationPercentage = remainingPercentage;
      } else {
        // Weight by adjusted APY
        allocationPercentage = Math.round(
          (protocol.adjustedApy / totalAdjustedApy) * 100
        );
        // Ensure we don't exceed 100%
        allocationPercentage = Math.min(
          allocationPercentage,
          remainingPercentage
        );
      }

      remainingPercentage -= allocationPercentage;

      // Only add if allocation is greater than 0
      if (allocationPercentage > 0) {
        recommendations.push({
          protocolId: protocol.id,
          protocolName: protocol.name,
          allocationPercentage,
          expectedApy: protocol.currentApy,
          riskLevel: this.getRiskLevelDescription(protocol.riskScore),
          reason: this.generateRecommendationReason(
            protocol,
            allocationPercentage
          ),
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate a reason for the recommendation
   * @param protocol Protocol information
   * @param allocationPercentage Percentage allocated
   * @returns A human-readable reason for the recommendation
   */
  private generateRecommendationReason(
    protocol: ProtocolInfo & { adjustedApy?: number },
    allocationPercentage: number
  ): string {
    const riskLevel = this.getRiskLevelDescription(protocol.riskScore);

    if (allocationPercentage > 50) {
      return `Strongly recommended due to ${protocol.currentApy}% APY with ${riskLevel} risk. This protocol offers the best risk-adjusted returns for your profile.`;
    } else if (allocationPercentage > 25) {
      return `Good allocation due to balanced ${protocol.currentApy}% APY and ${riskLevel} risk profile. Diversifies your portfolio.`;
    } else {
      return `Small allocation recommended for diversification. Offers ${protocol.currentApy}% APY with ${riskLevel} risk.`;
    }
  }

  /**
   * Check if funds need to be rebalanced based on APY changes
   * @param currentAllocation Current allocation percentages by protocol ID
   * @returns True if rebalancing is recommended
   */
  shouldRebalance(currentAllocation: Record<number, number>): boolean {
    // Get the recommended allocation
    let availableFunds = "1000"; // Placeholder amount
    const recommendations = this.optimizeAllocation(availableFunds);

    // Convert recommendations to a map for easy comparison
    const recommendedAllocation: Record<number, number> = {};
    recommendations.forEach((rec) => {
      recommendedAllocation[rec.protocolId] = rec.allocationPercentage;
    });

    // Check if there's a significant difference (>10%) in any allocation
    for (const protocolId in currentAllocation) {
      const current = currentAllocation[Number(protocolId)] || 0;
      const recommended = recommendedAllocation[Number(protocolId)] || 0;

      if (Math.abs(current - recommended) > 10) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all supported protocols and their info
   * @returns List of protocol information
   */
  getProtocolsInfo(): ProtocolInfo[] {
    return [...this.protocols];
  }
}
