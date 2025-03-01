module paymaster::yield_optimizer {
    use std::signer;
    use std::error;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::event::{Self, EventHandle};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_PROTOCOL_NOT_SUPPORTED: u64 = 2;
    const E_INSUFFICIENT_FUNDS: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_STRATEGY_NOT_FOUND: u64 = 5;
    
    /// Supported yield protocols
    const PROTOCOL_THALA: u8 = 1;
    const PROTOCOL_ARIES: u8 = 2;
    const PROTOCOL_MOMENTUM: u8 = 3;
    
    /// Yield strategy information
    struct YieldStrategy has store, drop {
        strategy_id: u64,
        protocol_id: u8,
        target_percentage: u64, // Percentage of idle funds to allocate (in basis points, 10000 = 100%)
        min_idle_amount: u64,   // Minimum amount of idle funds to trigger allocation
        is_active: bool,
    }
    
    /// Tracks user's yield strategies
    struct YieldStrategies<phantom CoinType> has key {
        strategies: Table<u64, YieldStrategy>,
        next_strategy_id: u64,
        strategy_created_events: EventHandle<StrategyCreatedEvent>,
        strategy_updated_events: EventHandle<StrategyUpdatedEvent>,
        funds_allocated_events: EventHandle<FundsAllocatedEvent>,
        funds_withdrawn_events: EventHandle<FundsWithdrawnEvent>,
    }
    
    /// Events
    struct StrategyCreatedEvent has drop, store {
        strategy_id: u64,
        protocol_id: u8,
        target_percentage: u64,
        min_idle_amount: u64,
    }
    
    struct StrategyUpdatedEvent has drop, store {
        strategy_id: u64,
        protocol_id: u8,
        target_percentage: u64,
        min_idle_amount: u64,
        is_active: bool,
    }
    
    struct FundsAllocatedEvent has drop, store {
        strategy_id: u64,
        protocol_id: u8,
        amount: u64,
        timestamp: u64,
    }
    
    struct FundsWithdrawnEvent has drop, store {
        strategy_id: u64,
        protocol_id: u8,
        amount: u64,
        timestamp: u64,
    }
    
    /// Initialize yield strategies for a user
    public entry fun initialize_yield_strategies<CoinType>(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<YieldStrategies<CoinType>>(account_addr)) {
            move_to(account, YieldStrategies<CoinType> {
                strategies: table::new(),
                next_strategy_id: 0,
                strategy_created_events: account::new_event_handle<StrategyCreatedEvent>(account),
                strategy_updated_events: account::new_event_handle<StrategyUpdatedEvent>(account),
                funds_allocated_events: account::new_event_handle<FundsAllocatedEvent>(account),
                funds_withdrawn_events: account::new_event_handle<FundsWithdrawnEvent>(account),
            });
        }
    }
    
    /// Create a new yield strategy
    public entry fun create_yield_strategy<CoinType>(
        account: &signer,
        protocol_id: u8,
        target_percentage: u64,
        min_idle_amount: u64
    ) acquires YieldStrategies {
        let account_addr = signer::address_of(account);
        
        // Validate parameters
        assert!(is_supported_protocol(protocol_id), error::invalid_argument(E_PROTOCOL_NOT_SUPPORTED));
        assert!(target_percentage <= 10000, error::invalid_argument(E_INVALID_AMOUNT)); // Max 100%
        
        // Initialize if not exists
        if (!exists<YieldStrategies<CoinType>>(account_addr)) {
            initialize_yield_strategies<CoinType>(account);
        };
        
        let strategies = borrow_global_mut<YieldStrategies<CoinType>>(account_addr);
        let strategy_id = strategies.next_strategy_id;
        
        // Create the strategy
        let strategy = YieldStrategy {
            strategy_id,
            protocol_id,
            target_percentage,
            min_idle_amount,
            is_active: true,
        };
        
        // Store the strategy
        table::add(&mut strategies.strategies, strategy_id, strategy);
        strategies.next_strategy_id = strategy_id + 1;
        
        // Emit event
        event::emit_event(
            &mut strategies.strategy_created_events,
            StrategyCreatedEvent {
                strategy_id,
                protocol_id,
                target_percentage,
                min_idle_amount,
            }
        );
    }
    
    /// Update an existing yield strategy
    public entry fun update_yield_strategy<CoinType>(
        account: &signer,
        strategy_id: u64,
        target_percentage: u64,
        min_idle_amount: u64,
        is_active: bool
    ) acquires YieldStrategies {
        let account_addr = signer::address_of(account);
        
        assert!(exists<YieldStrategies<CoinType>>(account_addr), error::not_found(E_STRATEGY_NOT_FOUND));
        assert!(target_percentage <= 10000, error::invalid_argument(E_INVALID_AMOUNT)); // Max 100%
        
        let strategies = borrow_global_mut<YieldStrategies<CoinType>>(account_addr);
        assert!(table::contains(&strategies.strategies, strategy_id), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategy = table::borrow_mut(&mut strategies.strategies, strategy_id);
        
        strategy.target_percentage = target_percentage;
        strategy.min_idle_amount = min_idle_amount;
        strategy.is_active = is_active;
        
        // Emit event
        event::emit_event(
            &mut strategies.strategy_updated_events,
            StrategyUpdatedEvent {
                strategy_id,
                protocol_id: strategy.protocol_id,
                target_percentage,
                min_idle_amount,
                is_active,
            }
        );
    }
    
    /// Allocate idle funds according to strategy (placeholder - actual protocol integrations would be implemented here)
    public entry fun allocate_idle_funds<CoinType>(
        account: &signer,
        strategy_id: u64,
        amount: u64
    ) acquires YieldStrategies {
        let account_addr = signer::address_of(account);
        
        assert!(exists<YieldStrategies<CoinType>>(account_addr), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategies = borrow_global_mut<YieldStrategies<CoinType>>(account_addr);
        assert!(table::contains(&strategies.strategies, strategy_id), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategy = table::borrow(&strategies.strategies, strategy_id);
        assert!(strategy.is_active, error::invalid_state(E_STRATEGY_NOT_FOUND));
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Ensure user has enough funds
        assert!(coin::balance<CoinType>(account_addr) >= amount, error::invalid_argument(E_INSUFFICIENT_FUNDS));
        
        // Protocol-specific logic would be implemented here
        // For now, we just emit the event as if funds were allocated
        
        // Emit event
        event::emit_event(
            &mut strategies.funds_allocated_events,
            FundsAllocatedEvent {
                strategy_id,
                protocol_id: strategy.protocol_id,
                amount,
                timestamp: timestamp::now_seconds(),
            }
        );
    }
    
    /// Withdraw funds from yield protocol (placeholder - actual protocol integrations would be implemented here)
    public entry fun withdraw_funds<CoinType>(
        account: &signer,
        strategy_id: u64,
        amount: u64
    ) acquires YieldStrategies {
        let account_addr = signer::address_of(account);
        
        assert!(exists<YieldStrategies<CoinType>>(account_addr), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategies = borrow_global_mut<YieldStrategies<CoinType>>(account_addr);
        assert!(table::contains(&strategies.strategies, strategy_id), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategy = table::borrow(&strategies.strategies, strategy_id);
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        // Protocol-specific withdrawal logic would be implemented here
        // For now, we just emit the event as if funds were withdrawn
        
        // Emit event
        event::emit_event(
            &mut strategies.funds_withdrawn_events,
            FundsWithdrawnEvent {
                strategy_id,
                protocol_id: strategy.protocol_id,
                amount,
                timestamp: timestamp::now_seconds(),
            }
        );
    }
    
    /// Check if a protocol is supported
    fun is_supported_protocol(protocol_id: u8): bool {
        protocol_id == PROTOCOL_THALA ||
        protocol_id == PROTOCOL_ARIES ||
        protocol_id == PROTOCOL_MOMENTUM
    }
    
    /// Get details of a yield strategy (view function)
    #[view]
    public fun get_strategy_details<CoinType>(
        owner: address,
        strategy_id: u64
    ): (u8, u64, u64, bool) acquires YieldStrategies {
        assert!(exists<YieldStrategies<CoinType>>(owner), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategies = borrow_global<YieldStrategies<CoinType>>(owner);
        assert!(table::contains(&strategies.strategies, strategy_id), error::not_found(E_STRATEGY_NOT_FOUND));
        
        let strategy = table::borrow(&strategies.strategies, strategy_id);
        
        (
            strategy.protocol_id,
            strategy.target_percentage,
            strategy.min_idle_amount,
            strategy.is_active
        )
    }
} 