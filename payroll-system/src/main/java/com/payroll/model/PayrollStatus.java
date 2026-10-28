package com.payroll.model;

import java.util.EnumSet;
import java.util.Set;

/**
 * Payroll lifecycle from the state diagram. "Created" and "Validated" happen inside a run
 * (validation) before a row exists, so persisted rows start at GENERATED.
 * GENERATED -> VERIFIED -> PAID, with CANCELLED reachable from GENERATED/VERIFIED
 * and CANCELLED -> GENERATED via reprocess.
 */
public enum PayrollStatus {
    GENERATED, VERIFIED, PAID, CANCELLED;

    public Set<PayrollStatus> next() {
        return switch (this) {
            case GENERATED -> EnumSet.of(VERIFIED, CANCELLED);
            case VERIFIED -> EnumSet.of(PAID, CANCELLED);
            case CANCELLED -> EnumSet.of(GENERATED);
            case PAID -> EnumSet.noneOf(PayrollStatus.class);
        };
    }

    public boolean canMoveTo(PayrollStatus target) {
        return next().contains(target);
    }
}
