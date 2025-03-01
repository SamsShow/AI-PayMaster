module paymaster::risk_manager {
    use std::signer;
    use std::error;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::event::{Self, EventHandle};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_THRESHOLD_INVALID: u64 = 2;
    const E_RISK_PROFILE_NOT_FOUND: u64 = 3;
    
    /// Risk level constants
    const RISK_LEVEL_LOW: u8 = 1;
    const RISK_LEVEL_MEDIUM: u8 = 2;
    const RISK_LEVEL_HIGH: u8 = 3;
    const RISK_LEVEL_CRITICAL: u8 = 4;
    
    /// Risk types
    const RISK_TYPE_LIQUIDITY: u8 = 1;
    const RISK_TYPE_COLLATERAL: u8 = 2;
    const RISK_TYPE_LIQUIDATION: u8 = 3;
    
    /// Risk threshold information
    struct RiskThreshold has store, drop {
        risk_type: u8,
        medium_threshold: u64, // Threshold for medium risk (in basis points if ratio, or absolute value)
        high_threshold: u64,   // Threshold for high risk
        critical_threshold: u64, // Threshold for critical risk
    }
    
    /// Risk profile for a user
    struct RiskProfile has key {
        thresholds: Table<u8, RiskThreshold>,
        current_risk_levels: Table<u8, u8>, // Maps risk_type to risk_level
        min_liquidity_requirement: u64,     // Minimum liquidity required for scheduled payments
        threshold_updated_events: EventHandle<ThresholdUpdatedEvent>,
        risk_level_changed_events: EventHandle<RiskLevelChangedEvent>,
    }
    
    /// Events
    struct ThresholdUpdatedEvent has drop, store {
        risk_type: u8,
        medium_threshold: u64,
        high_threshold: u64,
        critical_threshold: u64,
        timestamp: u64,
    }
    
    struct RiskLevelChangedEvent has drop, store {
        risk_type: u8,
        previous_level: u8,
        new_level: u8,
        timestamp: u64,
    }
    
    /// Initialize risk profile for a user
    public entry fun initialize_risk_profile(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<RiskProfile>(account_addr)) {
            // Create default thresholds table
            let thresholds = table::new();
            
            // Default liquidity risk thresholds (in basis points of required vs. available)
            table::add(&mut thresholds, RISK_TYPE_LIQUIDITY, RiskThreshold {
                risk_type: RISK_TYPE_LIQUIDITY,
                medium_threshold: 8000,  // 80% of required liquidity available
                high_threshold: 5000,    // 50% of required liquidity available
                critical_threshold: 2000, // 20% of required liquidity available
            });
            
            // Default collateral risk thresholds (in basis points of collateral ratio)
            table::add(&mut thresholds, RISK_TYPE_COLLATERAL, RiskThreshold {
                risk_type: RISK_TYPE_COLLATERAL,
                medium_threshold: 15000, // 150% collateral ratio
                high_threshold: 12500,   // 125% collateral ratio
                critical_threshold: 11000, // 110% collateral ratio
            });
            
            // Default liquidation risk thresholds (in seconds until potential liquidation)
            table::add(&mut thresholds, RISK_TYPE_LIQUIDATION, RiskThreshold {
                risk_type: RISK_TYPE_LIQUIDATION,
                medium_threshold: 86400 * 7, // 7 days
                high_threshold: 86400 * 3,   // 3 days
                critical_threshold: 86400,    // 1 day
            });
            
            // Initialize current risk levels table
            let risk_levels = table::new();
            table::add(&mut risk_levels, RISK_TYPE_LIQUIDITY, RISK_LEVEL_LOW);
            table::add(&mut risk_levels, RISK_TYPE_COLLATERAL, RISK_LEVEL_LOW);
            table::add(&mut risk_levels, RISK_TYPE_LIQUIDATION, RISK_LEVEL_LOW);
            
            move_to(account, RiskProfile {
                thresholds,
                current_risk_levels: risk_levels,
                min_liquidity_requirement: 0,
                threshold_updated_events: account::new_event_handle<ThresholdUpdatedEvent>(account),
                risk_level_changed_events: account::new_event_handle<RiskLevelChangedEvent>(account),
            });
        }
    }
    
    /// Update risk thresholds
    public entry fun update_risk_threshold(
        account: &signer,
        risk_type: u8,
        medium_threshold: u64,
        high_threshold: u64,
        critical_threshold: u64
    ) acquires RiskProfile {
        let account_addr = signer::address_of(account);
        
        // Validate risk type
        assert!(
            risk_type == RISK_TYPE_LIQUIDITY || 
            risk_type == RISK_TYPE_COLLATERAL || 
            risk_type == RISK_TYPE_LIQUIDATION,
            error::invalid_argument(E_THRESHOLD_INVALID)
        );
        
        // Validate threshold ordering
        assert!(
            medium_threshold > high_threshold && 
            high_threshold > critical_threshold,
            error::invalid_argument(E_THRESHOLD_INVALID)
        );
        
        assert!(exists<RiskProfile>(account_addr), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global_mut<RiskProfile>(account_addr);
        assert!(table::contains(&risk_profile.thresholds, risk_type), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let threshold = table::borrow_mut(&mut risk_profile.thresholds, risk_type);
        threshold.medium_threshold = medium_threshold;
        threshold.high_threshold = high_threshold;
        threshold.critical_threshold = critical_threshold;
        
        // Emit event
        event::emit_event(
            &mut risk_profile.threshold_updated_events,
            ThresholdUpdatedEvent {
                risk_type,
                medium_threshold,
                high_threshold,
                critical_threshold,
                timestamp: timestamp::now_seconds(),
            }
        );
    }
    
    /// Update minimum liquidity requirement
    public entry fun update_min_liquidity_requirement(
        account: &signer,
        min_liquidity_requirement: u64
    ) acquires RiskProfile {
        let account_addr = signer::address_of(account);
        
        assert!(exists<RiskProfile>(account_addr), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global_mut<RiskProfile>(account_addr);
        risk_profile.min_liquidity_requirement = min_liquidity_requirement;
    }
    
    /// Update the risk level assessment (can be called by agents)
    public entry fun update_risk_level(
        agent: &signer,
        user: address,
        risk_type: u8,
        risk_value: u64
    ) acquires RiskProfile {
        // Here we would typically check if the agent is authorized
        // For now, we'll allow any caller for demonstration
        
        assert!(exists<RiskProfile>(user), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global_mut<RiskProfile>(user);
        assert!(table::contains(&risk_profile.thresholds, risk_type), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let threshold = table::borrow(&risk_profile.thresholds, risk_type);
        let current_level = *table::borrow(&risk_profile.current_risk_levels, risk_type);
        
        // Calculate new risk level based on thresholds
        let new_level = if (risk_value >= threshold.medium_threshold) {
            RISK_LEVEL_LOW
        } else if (risk_value >= threshold.high_threshold) {
            RISK_LEVEL_MEDIUM
        } else if (risk_value >= threshold.critical_threshold) {
            RISK_LEVEL_HIGH
        } else {
            RISK_LEVEL_CRITICAL
        };
        
        // Only update and emit event if risk level changed
        if (new_level != current_level) {
            *table::borrow_mut(&mut risk_profile.current_risk_levels, risk_type) = new_level;
            
            event::emit_event(
                &mut risk_profile.risk_level_changed_events,
                RiskLevelChangedEvent {
                    risk_type,
                    previous_level: current_level,
                    new_level,
                    timestamp: timestamp::now_seconds(),
                }
            );
        }
    }
    
    /// Get the current risk level for a specific risk type (view function)
    #[view]
    public fun get_risk_level(
        user: address,
        risk_type: u8
    ): u8 acquires RiskProfile {
        assert!(exists<RiskProfile>(user), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global<RiskProfile>(user);
        assert!(table::contains(&risk_profile.current_risk_levels, risk_type), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        *table::borrow(&risk_profile.current_risk_levels, risk_type)
    }
    
    /// Get risk threshold details (view function)
    #[view]
    public fun get_risk_threshold(
        user: address,
        risk_type: u8
    ): (u64, u64, u64) acquires RiskProfile {
        assert!(exists<RiskProfile>(user), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global<RiskProfile>(user);
        assert!(table::contains(&risk_profile.thresholds, risk_type), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let threshold = table::borrow(&risk_profile.thresholds, risk_type);
        
        (
            threshold.medium_threshold,
            threshold.high_threshold,
            threshold.critical_threshold
        )
    }
    
    /// Get minimum liquidity requirement (view function)
    #[view]
    public fun get_min_liquidity_requirement(
        user: address
    ): u64 acquires RiskProfile {
        assert!(exists<RiskProfile>(user), error::not_found(E_RISK_PROFILE_NOT_FOUND));
        
        let risk_profile = borrow_global<RiskProfile>(user);
        risk_profile.min_liquidity_requirement
    }
} 