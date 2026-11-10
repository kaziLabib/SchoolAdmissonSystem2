
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = (
    import.meta.env.VITE_API_URL || "https://localhost:7104"
).replace(/\/$/, "");

const STUDENT_KEY = "school-admission-student-id";
const HOLD_PREFIX = "school-admission-holds-";

function validStudentId(value) {
    return /^[0-9]{17}$/.test(value);
}

function readStudentId() {
    try {
        return localStorage.getItem(STUDENT_KEY) || "";
    } catch {
        return "";
    }
}

function readSavedHolds(studentId) {
    try {
        const value = JSON.parse(
            localStorage.getItem(HOLD_PREFIX + studentId) || "[]"
        );
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function saveHold(studentId, hold) {
    try {
        const old = readSavedHolds(studentId);
        const updated = old.filter((item) => item.holdId !== hold.holdId);
        updated.push(hold);
        localStorage.setItem(HOLD_PREFIX + studentId, JSON.stringify(updated));
    } catch {
        // Browser storage may be unavailable.
    }
}

async function apiRequest(path, options = {}, studentId = "") {
    let response;

    try {
        response = await fetch(API_URL + path, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(studentId ? { "X-Student-Id": studentId } : {}),
                ...options.headers,
            },
        });
    } catch {
        throw new Error(
            "Cannot connect to the server. Please start your .NET backend."
        );
    }

    if (!response.ok) {
        let message = "";

        try {
            const data = await response.json();
            message =
                data.message ||
                data.title ||
                data.error ||
                (typeof data === "string" ? data : "");
        } catch {
            // The error response may not contain JSON.
        }

        if (!message) {
            if (response.status === 409) {
                message =
                    "This action could not be completed. The seat may be full, the hold may have expired, or an application may already exist.";
            } else if (response.status === 404) {
                message = "The requested record was not found.";
            } else if (response.status === 403) {
                message = "You cannot access this application.";
            } else if (response.status === 400) {
                message = "Please check the information you entered.";
            } else {
                message = `Server error ${response.status}.`;
            }
        }

        throw new Error(message);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

function getRemaining(expiresAt, now) {
    if (!expiresAt) return 0;
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return 0;
    return Math.max(0, Math.ceil((end - now) / 1000));
}

function getStatus(hold, now) {
    const status = String(hold.status || "").toUpperCase();

    if (
        status === "HELD" &&
        hold.expiresAt &&
        getRemaining(hold.expiresAt, now) <= 0
    ) {
        return "EXPIRED";
    }

    return status;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainder).padStart(2, "0")
    );
}

function getShift(name) {
    const text = String(name || "").toLowerCase();

    if (text.includes("morning shift")) return "Morning";
    if (text.includes("day shift")) return "Day";

    return "Other";
}

function Icon({ name, size = 20 }) {
    const paths = {
        school: (
            <>
                <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
                <path d="M9 11h.01M15 11h.01" />
            </>
        ),
        book: (
            <>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </>
        ),
        users: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </>
        ),
        clipboard: (
            <>
                <rect x="5" y="4" width="14" height="18" rx="2" />
                <rect x="9" y="2" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h6" />
            </>
        ),
        clock: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </>
        ),
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
            </>
        ),
        sunrise: (
            <>
                <path d="M12 2v2M4.93 4.93l1.42 1.42M2 12h2M20 12h2M17.65 6.35l1.42-1.42" />
                <path d="M12 8a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5ZM2 17h20M5 21h14" />
            </>
        ),
        check: <path d="m5 12 4 4L19 6" />,
        plus: <path d="M12 5v14M5 12h14" />,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        refresh: (
            <>
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M5.5 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.5-2" />
            </>
        ),
        settings: <path d="M4 7h16M4 17h16M8 4v6M16 14v6" />,
        alert: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6M12 17h.01" />
            </>
        ),
        shield: (
            <>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
            </>
        ),
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name] || paths.school}
        </svg>
    );
}

function StatCard({ icon, label, value, accent = false }) {
    return (
        <div className={`stat-card ${accent ? "accent-stat" : ""}`}>
            <span className="stat-icon">
                <Icon name={icon} size={22} />
            </span>
            <span className="stat-label">{label}</span>
            <strong>{Number(value).toLocaleString()}</strong>
        </div>
    );
}

function StepCard({ number, title, description }) {
    return (
        <div className="step-card">
            <span className="step-number">{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}

export default function App() {
    const [page, setPage] = useState("admission");

    const [studentId, setStudentId] = useState(readStudentId);
    const [selectedShift, setSelectedShift] = useState("Morning");

    const [classes, setClasses] = useState([]);
    const [holds, setHolds] = useState([]);

    const [now, setNow] = useState(Date.now());
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingHolds, setLoadingHolds] = useState(false);

    const [busy, setBusy] = useState("");
    const [notice, setNotice] = useState(null);

    const [className, setClassName] = useState("");
    const [adminShift, setAdminShift] = useState("Morning");
    const [totalSeats, setTotalSeats] = useState("");

    const studentIsValid = validStudentId(studentId);

    const currentStudentRef = useRef(studentId);
    currentStudentRef.current = studentId;

    const busyRef = useRef(false);

    useEffect(() => {
        try {
            localStorage.setItem(STUDENT_KEY, studentId);
        } catch {
            // Continue without local storage.
        }
    }, [studentId]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const loadClasses = useCallback(async (showError = true) => {
        try {
            const result = await apiRequest("/classes");
            setClasses(Array.isArray(result) ? result : []);
        } catch (error) {
            if (showError) {
                setNotice({ type: "error", text: error.message });
            }
        } finally {
            setLoadingClasses(false);
        }
    }, []);

    const loadHolds = useCallback(
        async (showError = true) => {
            if (!studentIsValid) {
                setHolds([]);
                setLoadingHolds(false);
                return;
            }

            const requestedStudent = studentId;
            const saved = readSavedHolds(requestedStudent);

            if (saved.length === 0) {
                setHolds([]);
                setLoadingHolds(false);
                return;
            }

            setLoadingHolds(true);

            try {
                const results = await Promise.allSettled(
                    saved.map((hold) =>
                        apiRequest(`/holds/${hold.holdId}`, {}, requestedStudent)
                    )
                );

                const loaded = [];
                let firstError = "";

                results.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        const serverHold = result.value;

                        if (serverHold) {
                            loaded.push({
                                ...saved[index],
                                ...serverHold,
                                holdId: serverHold.holdId || saved[index].holdId,
                                classId: serverHold.classId || saved[index].classId,
                            });
                        }
                    } else {
                        loaded.push(saved[index]);

                        if (!firstError) {
                            firstError = result.reason.message;
                        }
                    }
                });

                if (currentStudentRef.current === requestedStudent) {
                    setHolds(loaded);

                    if (showError && firstError) {
                        setNotice({ type: "error", text: firstError });
                    }
                }
            } finally {
                if (currentStudentRef.current === requestedStudent) {
                    setLoadingHolds(false);
                }
            }
        },
        [studentId, studentIsValid]
    );

    useEffect(() => {
        loadClasses();

        const interval = setInterval(() => {
            loadClasses(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [loadClasses]);

    useEffect(() => {
        setHolds(
            studentIsValid ? readSavedHolds(studentId) : []
        );

        if (studentIsValid) {
            loadHolds();
        } else {
            setLoadingHolds(false);
        }

        const interval = setInterval(() => {
            if (studentIsValid) loadHolds(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [studentId, studentIsValid, loadHolds]);

    async function refreshAll() {
        await Promise.all([loadClasses(true), loadHolds(true)]);
    }

    async function performAction(key, operation, successMessage) {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(key);
        setNotice(null);

        try {
            await operation();

            setNotice({
                type: "success",
                text: successMessage,
            });

            await Promise.all([
                loadClasses(false),
                loadHolds(false),
            ]);
        } catch (error) {
            setNotice({
                type: "error",
                text: error.message,
            });
        } finally {
            busyRef.current = false;
            setBusy("");
        }
    }

    function holdSeat(classId) {
        if (!studentIsValid) {
            setNotice({
                type: "error",
                text: "Enter a valid 17-digit birth registration number first.",
            });

            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        const existing = holds.some((hold) => {
            const status = getStatus(hold, Date.now());

            return (
                String(hold.classId) === String(classId) &&
                ["HELD", "CONFIRMED"].includes(status)
            );
        });

        if (existing) {
            setPage("applications");
            setNotice({
                type: "error",
                text: "You already have an active or confirmed application for this class.",
            });
            return;
        }

        const applyingStudent = studentId;

        performAction(
            `hold-${classId}`,
            async () => {
                const result = await apiRequest(
                    `/classes/${classId}/holds`,
                    { method: "POST" },
                    applyingStudent
                );

                if (!result?.holdId) {
                    throw new Error("The server did not return a hold ID.");
                }

                const newHold = {
                    ...result,
                    classId: result.classId || classId,
                    studentId: applyingStudent,
                };

                saveHold(applyingStudent, newHold);

                if (currentStudentRef.current === applyingStudent) {
                    setHolds((previous) => [
                        ...previous.filter(
                            (item) => item.holdId !== newHold.holdId
                        ),
                        newHold,
                    ]);

                    setPage("applications");
                }
            },
            "Seat reserved successfully! Confirm before the timer expires."
        );
    }

    function confirmHold(holdId) {
        const applyingStudent = studentId;

        performAction(
            `confirm-${holdId}`,
            async () => {
                const result = await apiRequest(
                    `/holds/${holdId}/confirm`,
                    { method: "POST" },
                    applyingStudent
                );

                const old = readSavedHolds(applyingStudent);
                const existing = old.find(
                    (item) => item.holdId === holdId
                );

                if (existing) {
                    saveHold(applyingStudent, {
                        ...existing,
                        ...result,
                        status: "CONFIRMED",
                    });
                }
            },
            "Your admission has been confirmed successfully!"
        );
    }

    function cancelHold(holdId) {
        if (
            !window.confirm(
                "Are you sure you want to cancel this seat reservation?"
            )
        ) {
            return;
        }

        const applyingStudent = studentId;

        performAction(
            `cancel-${holdId}`,
            async () => {
                await apiRequest(
                    `/holds/${holdId}`,
                    { method: "DELETE" },
                    applyingStudent
                );

                const old = readSavedHolds(applyingStudent);
                const existing = old.find(
                    (item) => item.holdId === holdId
                );

                if (existing) {
                    saveHold(applyingStudent, {
                        ...existing,
                        status: "CANCELLED",
                    });
                }
            },
            "Your seat reservation was cancelled successfully."
        );
    }

    function createClass(event) {
        event.preventDefault();

        const name = `${className.trim()} - ${adminShift} Shift`;
        const seats = Number(totalSeats);

        if (
            !className.trim() ||
            !Number.isInteger(seats) ||
            seats <= 0
        ) {
            setNotice({
                type: "error",
                text: "Enter a class name and a positive whole number of seats.",
            });
            return;
        }

        const duplicate = classes.some(
            (item) =>
                item.name.trim().toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
            setNotice({
                type: "error",
                text: `${name} already exists.`,
            });
            return;
        }

        performAction(
            "create-class",
            async () => {
                await apiRequest("/classes", {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        totalSeats: seats,
                    }),
                });

                setClassName("");
                setTotalSeats("");
            },
            `${name} created successfully.`
        );
    }

    function forgetApplications() {
        if (!studentIsValid) return;

        if (
            !window.confirm(
                "Forget saved application IDs from this browser? Database applications will NOT be deleted."
            )
        ) {
            return;
        }

        try {
            localStorage.removeItem(HOLD_PREFIX + studentId);
        } catch {
            // Ignore browser storage errors.
        }

        setHolds([]);
        setNotice({
            type: "success",
            text: "Browser-saved applications cleared. Database records were not deleted.",
        });
    }

    const visibleClasses = classes.filter(
        (item) => getShift(item.name) === selectedShift
    );

    const totalCapacity = classes.reduce(
        (sum, item) => sum + Number(item.totalSeats || 0),
        0
    );

    const availableSeats = classes.reduce(
        (sum, item) => sum + Number(item.availableSeats || 0),
        0
    );

    const confirmedSeats = classes.reduce(
        (sum, item) => sum + Number(item.confirmedSeats || 0),
        0
    );

    const activeApplications = holds.filter((hold) =>
        ["HELD", "CONFIRMED"].includes(getStatus(hold, now))
    ).length;

    return (
        <div className="portal">
            <header className="site-header">
                <div className="header-inner">
                    <button
                        type="button"
                        className="brand"
                        onClick={() => setPage("admission")}
                    >
                        <span className="brand-icon">
                            <Icon name="school" size={25} />
                        </span>

                        <span className="brand-copy">
                            <strong>School Admission</strong>
                            <small>Online Admission Portal</small>
                        </span>
                    </button>

                    <nav className="main-nav">
                        <button
                            type="button"
                            className={`nav-link ${page === "admission" ? "active" : ""}`}
                            onClick={() => setPage("admission")}
                        >
                            <Icon name="book" size={17} />
                            Admission
                        </button>

                        <button
                            type="button"
                            className={`nav-link ${page === "applications" ? "active" : ""}`}
                            onClick={() => setPage("applications")}
                        >
                            <Icon name="clipboard" size={17} />
                            My Applications
                        </button>

                        <button
                            type="button"
                            className={`nav-link ${page === "admin" ? "active" : ""}`}
                            onClick={() => setPage("admin")}
                        >
                            <Icon name="settings" size={17} />
                            Administration
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                <section className="hero">
                    <div className="page-container hero-inner">
                        <div className="hero-copy">
                            <span className="eyebrow">
                                <span className="eyebrow-dot" />
                                ONLINE ADMISSION SYSTEM
                            </span>

                            <h1>
                                A brighter future
                                <br />
                                begins <span>here.</span>
                            </h1>

                            <p>
                                Explore available classes, choose your preferred shift,
                                reserve your seat, and complete your admission journey.
                            </p>

                            <div className="hero-features">
                                <span>
                                    <Icon name="check" size={16} />
                                    Simple application
                                </span>

                                <span>
                                    <Icon name="clock" size={16} />
                                    Live seat availability
                                </span>

                                <span>
                                    <Icon name="shield" size={16} />
                                    Transparent process
                                </span>
                            </div>
                        </div>

                        <div className="hero-art" aria-hidden="true">
                            <div className="hero-art-circle outer" />
                            <div className="hero-art-circle inner" />
                            <div className="hero-art-icon">
                                <Icon name="school" size={86} />
                            </div>
                            <div className="hero-art-label">
                                YOUR JOURNEY STARTS HERE
                            </div>
                        </div>
                    </div>
                </section>

                <div className="page-container content-area">
                    {notice && (
                        <div
                            className={`notification ${notice.type}`}
                            role={notice.type === "error" ? "alert" : "status"}
                        >
                            <Icon
                                name={notice.type === "error" ? "alert" : "check"}
                                size={19}
                            />
                            <span>{notice.text}</span>

                            <button
                                type="button"
                                className="dismiss-button"
                                onClick={() => setNotice(null)}
                                aria-label="Dismiss message"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {page !== "admin" && (
                        <section className="identity-card">
                            <div className="identity-info">
                                <span className="section-icon">
                                    <Icon name="users" size={23} />
                                </span>

                                <div>
                                    <h2>Student Identification</h2>
                                    <p>
                                        Enter your 17-digit birth registration number to
                                        access admission services.
                                    </p>
                                </div>
                            </div>

                            <div className="identity-input-wrap">
                                <label htmlFor="student-id">
                                    Birth Registration Number
                                </label>

                                <input
                                    id="student-id"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={17}
                                    placeholder="Enter 17-digit number"
                                    value={studentId}
                                    onChange={(event) =>
                                        setStudentId(
                                            event.target.value.replace(/\D/g, "")
                                        )
                                    }
                                />

                                <small className={studentIsValid ? "valid-hint" : ""}>
                                    {studentIsValid
                                        ? "Valid 17-digit format"
                                        : `${studentId.length} of 17 digits entered`}
                                </small>
                            </div>
                        </section>
                    )}

                    {page === "admission" && (
                        <>
                            <div className="stats-grid">
                                <StatCard
                                    icon="school"
                                    label="Available Classes"
                                    value={classes.length}
                                />

                                <StatCard
                                    icon="users"
                                    label="Total Capacity"
                                    value={totalCapacity}
                                />

                                <StatCard
                                    icon="check"
                                    label="Available Seats"
                                    value={availableSeats}
                                    accent
                                />

                                <StatCard
                                    icon="clipboard"
                                    label="Confirmed Admissions"
                                    value={confirmedSeats}
                                />
                            </div>

                            <section className="shift-selection">
                                <div className="shift-heading">
                                    <span className="section-kicker">
                                        SELECT YOUR PREFERRED SHIFT
                                    </span>

                                    <h2>Choose an Admission Shift</h2>

                                    <p>
                                        View classes and available seats for your
                                        preferred school shift.
                                    </p>
                                </div>

                                <div
                                    className="shift-options"
                                    role="group"
                                    aria-label="Admission shift"
                                >
                                    <button
                                        type="button"
                                        className={`shift-button ${selectedShift === "Morning" ? "selected" : ""
                                            }`}
                                        aria-pressed={selectedShift === "Morning"}
                                        onClick={() => setSelectedShift("Morning")}
                                    >
                                        <Icon name="sunrise" size={21} />
                                        <span>Morning Shift</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`shift-button ${selectedShift === "Day" ? "selected" : ""
                                            }`}
                                        aria-pressed={selectedShift === "Day"}
                                        onClick={() => setSelectedShift("Day")}
                                    >
                                        <Icon name="sun" size={21} />
                                        <span>Day Shift</span>
                                    </button>
                                </div>
                            </section>

                            <section className="section-block">
                                <div className="section-topline">
                                    <div>
                                        <span className="section-kicker">
                                            FIND YOUR CLASS
                                        </span>

                                        <h2>
                                            {selectedShift} Shift — Available Classes
                                        </h2>

                                        <p>
                                            Select a class to reserve your seat.
                                            Availability updates automatically.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={refreshAll}
                                    >
                                        <Icon name="refresh" size={17} />
                                        Refresh
                                    </button>
                                </div>

                                {loadingClasses ? (
                                    <div className="empty-state">
                                        Loading available classes...
                                    </div>
                                ) : visibleClasses.length === 0 ? (
                                    <div className="empty-state">
                                        <Icon
                                            name={selectedShift === "Morning" ? "sunrise" : "sun"}
                                            size={36}
                                        />

                                        <h3>
                                            No {selectedShift} Shift classes available
                                        </h3>

                                        <p>
                                            This shift has not been created yet.
                                            Create it from Administration, then return here.
                                        </p>

                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => setPage("admin")}
                                        >
                                            Go to Administration
                                            <Icon name="arrow" size={17} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="class-grid">
                                        {visibleClasses.map((item) => {
                                            const available = Number(
                                                item.availableSeats || 0
                                            );

                                            const full = available <= 0;

                                            const existingHold = holds.find((hold) => {
                                                const status = getStatus(hold, now);

                                                return (
                                                    String(hold.classId) === String(item.id) &&
                                                    ["HELD", "CONFIRMED"].includes(status)
                                                );
                                            });

                                            const occupied =
                                                Number(item.heldSeats || 0) +
                                                Number(item.confirmedSeats || 0);

                                            const progress =
                                                Number(item.totalSeats) > 0
                                                    ? (occupied / Number(item.totalSeats)) * 100
                                                    : 0;

                                            return (
                                                <article className="class-card" key={item.id}>
                                                    <div className="class-card-top">
                                                        <span className="class-avatar">
                                                            <Icon name="book" size={24} />
                                                        </span>

                                                        <span
                                                            className={`availability-badge ${full ? "full" : "open"
                                                                }`}
                                                        >
                                                            {full ? "Seats Full" : "Admissions Open"}
                                                        </span>
                                                    </div>

                                                    <div className="class-shift-label">
                                                        {selectedShift} Shift
                                                    </div>

                                                    <h3>{item.name}</h3>

                                                    <p className="class-subtitle">
                                                        Online admission · First come, first served
                                                    </p>

                                                    <div className="seat-highlight">
                                                        <strong>{available}</strong>
                                                        <span>seats available</span>
                                                    </div>

                                                    <div className="capacity-track">
                                                        <div
                                                            className="capacity-fill"
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    Math.max(0, progress)
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="seat-breakdown">
                                                        <span>
                                                            Total
                                                            <strong>{item.totalSeats}</strong>
                                                        </span>

                                                        <span>
                                                            Held
                                                            <strong>{item.heldSeats}</strong>
                                                        </span>

                                                        <span>
                                                            Confirmed
                                                            <strong>{item.confirmedSeats}</strong>
                                                        </span>
                                                    </div>

                                                    {existingHold ? (
                                                        <button
                                                            type="button"
                                                            className="secondary-button full-width"
                                                            onClick={() => setPage("applications")}
                                                        >
                                                            View My Application
                                                            <Icon name="arrow" size={17} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="primary-button full-width"
                                                            disabled={full || Boolean(busy)}
                                                            onClick={() => holdSeat(item.id)}
                                                        >
                                                            {busy === `hold-${item.id}`
                                                                ? "Reserving..."
                                                                : full
                                                                    ? "No Seats Available"
                                                                    : "Hold a Seat"}

                                                            {!full && <Icon name="arrow" size={18} />}
                                                        </button>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <section className="steps-section">
                                <div className="section-topline">
                                    <div>
                                        <span className="section-kicker">
                                            HOW IT WORKS
                                        </span>
                                        <h2>Three Simple Steps</h2>
                                    </div>
                                </div>

                                <div className="steps-grid">
                                    <StepCard
                                        number="01"
                                        title="Choose Your Shift"
                                        description="Select Morning or Day Shift and browse available classes."
                                    />

                                    <StepCard
                                        number="02"
                                        title="Reserve a Seat"
                                        description="Temporarily hold an available seat using your birth registration number."
                                    />

                                    <StepCard
                                        number="03"
                                        title="Confirm Admission"
                                        description="Confirm your admission before the reservation expires."
                                    />
                                </div>
                            </section>
                        </>
                    )}

                    {page === "applications" && (
                        <section className="section-block">
                            <div className="section-topline">
                                <div>
                                    <span className="section-kicker">
                                        YOUR ADMISSION JOURNEY
                                    </span>

                                    <h2>My Applications</h2>

                                    <p>
                                        View reservations, countdowns, confirmations,
                                        and cancellations.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={refreshAll}
                                >
                                    <Icon name="refresh" size={17} />
                                    Refresh
                                </button>
                            </div>

                            {!studentIsValid ? (
                                <div className="empty-state">
                                    <Icon name="users" size={36} />
                                    <h3>Student identification required</h3>
                                    <p>
                                        Enter your 17-digit birth registration number above.
                                    </p>
                                </div>
                            ) : loadingHolds && holds.length === 0 ? (
                                <div className="empty-state">
                                    Loading your applications...
                                </div>
                            ) : holds.length === 0 ? (
                                <div className="empty-state">
                                    <Icon name="clipboard" size={36} />
                                    <h3>No saved applications found</h3>

                                    <p>
                                        New reservations made in this browser will appear here.
                                        Older database applications require the /me/holds API.
                                    </p>

                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() => setPage("admission")}
                                    >
                                        Browse Classes
                                        <Icon name="arrow" size={17} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="application-summary">
                                        <Icon name="clipboard" size={20} />
                                        <span>
                                            You have <strong>{activeApplications}</strong>{" "}
                                            active or confirmed application(s).
                                        </span>
                                    </div>

                                    <div className="applications-grid">
                                        {holds.map((hold) => {
                                            const status = getStatus(hold, now);
                                            const remaining = getRemaining(
                                                hold.expiresAt,
                                                now
                                            );

                                            const matchingClass = classes.find(
                                                (item) =>
                                                    String(item.id) === String(hold.classId)
                                            );

                                            const name =
                                                hold.className ||
                                                matchingClass?.name ||
                                                "School Class";

                                            return (
                                                <article
                                                    className="application-card"
                                                    key={hold.holdId}
                                                >
                                                    <div className="application-header">
                                                        <div>
                                                            <span className="section-kicker">
                                                                ADMISSION APPLICATION
                                                            </span>

                                                            <h3>{name}</h3>
                                                        </div>

                                                        <span
                                                            className={`application-status ${status.toLowerCase()}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </div>

                                                    <div className="application-detail">
                                                        <span>Application ID</span>
                                                        <code>{hold.holdId}</code>
                                                    </div>

                                                    {status === "HELD" && (
                                                        <div className="countdown-box">
                                                            <div>
                                                                <span>
                                                                    Time remaining to confirm
                                                                </span>

                                                                <strong>
                                                                    {formatTime(remaining)}
                                                                </strong>
                                                            </div>

                                                            <Icon name="clock" size={28} />
                                                        </div>
                                                    )}

                                                    {status === "CONFIRMED" && (
                                                        <div className="confirmed-box">
                                                            <Icon name="check" size={20} />
                                                            Your admission is confirmed.
                                                        </div>
                                                    )}

                                                    {status === "EXPIRED" && (
                                                        <div className="expired-box">
                                                            This reservation has expired.
                                                            You can apply again if seats are available.
                                                        </div>
                                                    )}

                                                    {status === "CANCELLED" && (
                                                        <div className="expired-box">
                                                            This reservation was cancelled.
                                                        </div>
                                                    )}

                                                    {status === "HELD" && (
                                                        <div className="application-actions">
                                                            <button
                                                                type="button"
                                                                className="primary-button"
                                                                disabled={Boolean(busy)}
                                                                onClick={() =>
                                                                    confirmHold(hold.holdId)
                                                                }
                                                            >
                                                                {busy === `confirm-${hold.holdId}`
                                                                    ? "Confirming..."
                                                                    : "Confirm Admission"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="outline-danger-button"
                                                                disabled={Boolean(busy)}
                                                                onClick={() =>
                                                                    cancelHold(hold.holdId)
                                                                }
                                                            >
                                                                Cancel Hold
                                                            </button>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {studentIsValid && holds.length > 0 && (
                                <div className="admin-note">
                                    <Icon name="alert" size={19} />

                                    <div>
                                        <p>
                                            Applications are remembered in this browser.
                                            Full database recovery requires /me/holds.
                                        </p>

                                        <button
                                            type="button"
                                            className="secondary-button"
                                            style={{ marginTop: 12 }}
                                            onClick={forgetApplications}
                                        >
                                            Forget Saved Applications
                                        </button>

                                        <p style={{ marginTop: 8 }}>
                                            This does not delete database records or free seats.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {page === "admin" && (
                        <>
                            <section className="section-block">
                                <div className="section-topline">
                                    <div>
                                        <span className="section-kicker">
                                            SCHOOL MANAGEMENT
                                        </span>

                                        <h2>Administration</h2>

                                        <p>
                                            Create classes and manage separate seat
                                            capacities for Morning and Day shifts.
                                        </p>
                                    </div>
                                </div>

                                <div className="admin-layout">
                                    <form
                                        className="admin-form-card"
                                        onSubmit={createClass}
                                    >
                                        <div className="form-heading">
                                            <span className="section-icon">
                                                <Icon name="plus" size={22} />
                                            </span>

                                            <div>
                                                <h3>Create New Class</h3>
                                                <p>
                                                    Set up a class and its admission capacity.
                                                </p>
                                            </div>
                                        </div>

                                        <label htmlFor="class-name">
                                            Class Name
                                        </label>

                                        <input
                                            id="class-name"
                                            placeholder="e.g. Class 6"
                                            value={className}
                                            onChange={(event) =>
                                                setClassName(event.target.value)
                                            }
                                            required
                                        />

                                        <label htmlFor="class-shift">
                                            Shift
                                        </label>

                                        <select
                                            id="class-shift"
                                            value={adminShift}
                                            onChange={(event) =>
                                                setAdminShift(event.target.value)
                                            }
                                        >
                                            <option value="Morning">
                                                Morning Shift
                                            </option>
                                            <option value="Day">
                                                Day Shift
                                            </option>
                                        </select>

                                        <label htmlFor="class-seats">
                                            Total Seats
                                        </label>

                                        <input
                                            id="class-seats"
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="e.g. 120"
                                            value={totalSeats}
                                            onChange={(event) =>
                                                setTotalSeats(event.target.value)
                                            }
                                            required
                                        />

                                        <button
                                            type="submit"
                                            className="primary-button full-width"
                                            disabled={Boolean(busy)}
                                        >
                                            <Icon name="plus" size={18} />
                                            {busy === "create-class"
                                                ? "Creating..."
                                                : "Create Class"}
                                        </button>
                                    </form>

                                    <div className="admin-overview">
                                        <div className="admin-overview-heading">
                                            <h3>Class Overview</h3>
                                            <span>{classes.length} classes</span>
                                        </div>

                                        {classes.length === 0 ? (
                                            <p className="muted">
                                                No classes created yet.
                                            </p>
                                        ) : (
                                            <div className="admin-class-list">
                                                {classes.map((item) => (
                                                    <div
                                                        className="admin-class-row"
                                                        key={item.id}
                                                    >
                                                        <div>
                                                            <strong>{item.name}</strong>

                                                            <small>
                                                                {item.totalSeats} total seats ·{" "}
                                                                {item.heldSeats} held ·{" "}
                                                                {item.confirmedSeats} confirmed
                                                            </small>
                                                        </div>

                                                        <span>
                                                            {item.availableSeats} available
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="admin-note">
                                <Icon name="alert" size={19} />

                                <p>
                                    This demonstration has no administrator login.
                                    The Administration page is accessible to everyone,
                                    so it must not be treated as a secure production
                                    management system.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <footer className="site-footer">
                <div className="page-container footer-inner">
                    <span>© School Admission Portal</span>
                    <span>
                        Simple, transparent online admissions.
                    </span>
                </div>
            </footer>
        </div>
    );
}
