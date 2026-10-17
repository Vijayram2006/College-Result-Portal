package edu.kvell.results.common;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Short-lived cache for what students and the public read most on result day: a student's published results and
 * the public summary. Entries live TTL_MILLIS and every change to published data (publish, withdraw, delete, student
 * changes) clears the whole cache, so nobody sees an outdated result. Concurrent requests for the same missing key
 * wait for one database read instead of all reading at once (no cache stampede when results go live). The database
 * stays the source of truth: if the cache is empty or cleared, requests simply read the database.
 */
@Component
public class ResultsCache {

    static final long TTL_MILLIS = 10 * 60 * 1000;
    private static final int MAX_ENTRIES = 50_000;

    private record Entry(Object value, long loadedAt, long generation) {
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final AtomicLong generation = new AtomicLong();

    @SuppressWarnings("unchecked")
    public <T> T get(String key, Supplier<T> loader) {
        long now = System.currentTimeMillis();
        long gen = generation.get();
        Entry hit = entries.get(key);
        if (fresh(hit, now, gen)) return (T) hit.value();
        if (entries.size() > MAX_ENTRIES) entries.clear();
        Entry loaded = entries.compute(key, (k, old) -> fresh(old, now, gen) ? old
                : new Entry(loader.get(), System.currentTimeMillis(), gen));
        return (T) loaded.value();
    }

    /**
     * Called by any change to published results or students. Inside a transaction it clears again once the change is
     * committed, so a read that slipped in before the commit cannot keep the old answer cached.
     */
    public void clear() {
        clearNow();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    clearNow();
                }
            });
        }
    }

    private void clearNow() {
        generation.incrementAndGet();
        entries.clear();
    }

    private static boolean fresh(Entry e, long now, long gen) {
        return e != null && e.generation() == gen && now - e.loadedAt() < TTL_MILLIS;
    }
}
