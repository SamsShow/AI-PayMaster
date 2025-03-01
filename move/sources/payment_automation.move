module paymaster::payment_automation {
    use std::signer;
    use std::vector;
    use std::error;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::event::{Self, EventHandle};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_PAYMENT_NOT_FOUND: u64 = 2;
    const E_INSUFFICIENT_FUNDS: u64 = 3;
    const E_INVALID_SCHEDULE: u64 = 4;
    const E_INVALID_RECIPIENT: u64 = 5;

    /// Represents a scheduled payment
    struct ScheduledPayment<phantom CoinType> has store, drop {
        payment_id: u64,
        recipient: address,
        amount: u64,
        interval_seconds: u64,
        next_payment_time: u64,
        is_active: bool,
    }

    /// Stores all payment schedules for a user
    struct PaymentSchedules<phantom CoinType> has key {
        payments: Table<u64, ScheduledPayment<CoinType>>,
        next_payment_id: u64,
        payment_created_events: EventHandle<PaymentCreatedEvent>,
        payment_executed_events: EventHandle<PaymentExecutedEvent>,
        payment_cancelled_events: EventHandle<PaymentCancelledEvent>,
    }

    /// Events
    struct PaymentCreatedEvent has drop, store {
        payment_id: u64,
        recipient: address,
        amount: u64,
        interval_seconds: u64,
        next_payment_time: u64,
    }

    struct PaymentExecutedEvent has drop, store {
        payment_id: u64,
        recipient: address,
        amount: u64,
        executed_at: u64,
        next_payment_time: u64,
    }

    struct PaymentCancelledEvent has drop, store {
        payment_id: u64,
        cancelled_at: u64,
    }

    /// Initialize payment schedules for a user
    public entry fun initialize_payment_schedules<CoinType>(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<PaymentSchedules<CoinType>>(account_addr)) {
            move_to(account, PaymentSchedules<CoinType> {
                payments: table::new(),
                next_payment_id: 0,
                payment_created_events: account::new_event_handle<PaymentCreatedEvent>(account),
                payment_executed_events: account::new_event_handle<PaymentExecutedEvent>(account),
                payment_cancelled_events: account::new_event_handle<PaymentCancelledEvent>(account),
            });
        }
    }

    /// Create a new scheduled payment
    public entry fun create_scheduled_payment<CoinType>(
        account: &signer,
        recipient: address,
        amount: u64,
        interval_seconds: u64,
        start_time: u64
    ) acquires PaymentSchedules {
        let account_addr = signer::address_of(account);
        
        // Validate parameters
        assert!(interval_seconds > 0, error::invalid_argument(E_INVALID_SCHEDULE));
        assert!(amount > 0, error::invalid_argument(E_INVALID_SCHEDULE));
        assert!(recipient != @0x0, error::invalid_argument(E_INVALID_RECIPIENT));
        
        // Initialize if not exists
        if (!exists<PaymentSchedules<CoinType>>(account_addr)) {
            initialize_payment_schedules<CoinType>(account);
        };
        
        let schedules = borrow_global_mut<PaymentSchedules<CoinType>>(account_addr);
        let payment_id = schedules.next_payment_id;
        
        // Use provided start time or current timestamp if start_time is 0
        let next_payment_time = if (start_time == 0) {
            timestamp::now_seconds()
        } else {
            start_time
        };
        
        // Create the payment
        let payment = ScheduledPayment<CoinType> {
            payment_id,
            recipient,
            amount,
            interval_seconds,
            next_payment_time,
            is_active: true,
        };
        
        // Store the payment
        table::add(&mut schedules.payments, payment_id, payment);
        schedules.next_payment_id = payment_id + 1;
        
        // Emit event
        event::emit_event(
            &mut schedules.payment_created_events,
            PaymentCreatedEvent {
                payment_id,
                recipient,
                amount,
                interval_seconds,
                next_payment_time,
            }
        );
    }

    /// Cancel a scheduled payment
    public entry fun cancel_scheduled_payment<CoinType>(
        account: &signer,
        payment_id: u64
    ) acquires PaymentSchedules {
        let account_addr = signer::address_of(account);
        
        assert!(exists<PaymentSchedules<CoinType>>(account_addr), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let schedules = borrow_global_mut<PaymentSchedules<CoinType>>(account_addr);
        assert!(table::contains(&schedules.payments, payment_id), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let payment = table::borrow_mut(&mut schedules.payments, payment_id);
        payment.is_active = false;
        
        // Emit event
        event::emit_event(
            &mut schedules.payment_cancelled_events,
            PaymentCancelledEvent {
                payment_id,
                cancelled_at: timestamp::now_seconds(),
            }
        );
    }

    /// Execute a pending payment (can be called by anyone)
    public entry fun execute_payment<CoinType>(
        executor: &signer, 
        payer: address,
        payment_id: u64
    ) acquires PaymentSchedules {
        assert!(exists<PaymentSchedules<CoinType>>(payer), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let schedules = borrow_global_mut<PaymentSchedules<CoinType>>(payer);
        assert!(table::contains(&schedules.payments, payment_id), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let payment = table::borrow_mut(&mut schedules.payments, payment_id);
        assert!(payment.is_active, error::invalid_state(E_PAYMENT_NOT_FOUND));
        
        // Check if payment is due
        let current_time = timestamp::now_seconds();
        assert!(current_time >= payment.next_payment_time, error::invalid_state(E_INVALID_SCHEDULE));
        
        // Transfer funds
        let executor_addr = signer::address_of(executor);
        if (executor_addr == payer) {
            // Direct payment from payer
            coin::transfer<CoinType>(executor, payment.recipient, payment.amount);
        } else {
            // For future: implement agent execution logic
            // For now, only the payer can execute their payments
            abort error::permission_denied(E_NOT_AUTHORIZED);
        };
        
        // Update next payment time
        payment.next_payment_time = current_time + payment.interval_seconds;
        
        // Emit event
        event::emit_event(
            &mut schedules.payment_executed_events,
            PaymentExecutedEvent {
                payment_id,
                recipient: payment.recipient,
                amount: payment.amount,
                executed_at: current_time,
                next_payment_time: payment.next_payment_time,
            }
        );
    }

    /// Get details of a scheduled payment (view function)
    #[view]
    public fun get_payment_details<CoinType>(
        payer: address,
        payment_id: u64
    ): (address, u64, u64, u64, bool) acquires PaymentSchedules {
        assert!(exists<PaymentSchedules<CoinType>>(payer), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let schedules = borrow_global<PaymentSchedules<CoinType>>(payer);
        assert!(table::contains(&schedules.payments, payment_id), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let payment = table::borrow(&schedules.payments, payment_id);
        
        (
            payment.recipient,
            payment.amount,
            payment.interval_seconds,
            payment.next_payment_time,
            payment.is_active
        )
    }

    /// Check if a payment is due for execution
    #[view]
    public fun is_payment_due<CoinType>(
        payer: address,
        payment_id: u64
    ): bool acquires PaymentSchedules {
        assert!(exists<PaymentSchedules<CoinType>>(payer), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let schedules = borrow_global<PaymentSchedules<CoinType>>(payer);
        assert!(table::contains(&schedules.payments, payment_id), error::not_found(E_PAYMENT_NOT_FOUND));
        
        let payment = table::borrow(&schedules.payments, payment_id);
        
        payment.is_active && timestamp::now_seconds() >= payment.next_payment_time
    }
} 