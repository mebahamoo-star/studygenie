package com.studygenie.backend.repository;

import com.studygenie.backend.entity.PointsLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Append-only: do not call save() to update an existing row, 
 * and avoid delete()/deleteById() outside of explicit data-retention/GDPR tooling.
 */
@Repository
public interface PointsLedgerRepository extends JpaRepository<PointsLedger, Long> {
}
