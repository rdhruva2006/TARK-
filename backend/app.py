import streamlit as st
import streamlit.components.v1 as components
import json
from bedrock_engine import evaluate_logic

# Configure the Streamlit page
st.set_page_config(
    page_title="TARK - Space Hackathon",
    page_icon="�",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for glassmorphism and space theme
st.markdown("""
<style>
    /* Transparent background for ANN */
    .stApp {
        background-color: transparent;
        color: #e0e0e0;
        font-family: 'Inter', sans-serif;
    }
    
    /* Glowing TARK Header */
    .title-h1 {
        font-size: 5rem;
        font-weight: 900;
        text-align: center;
        background: linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #f093fb 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 20px rgba(0, 242, 254, 0.4);
        margin-bottom: 0;
        padding-top: 20px;
    }
    
    .subtitle {
        text-align: center;
        font-size: 1.5rem;
        color: #a0a0c0;
        margin-top: -10px;
        margin-bottom: 40px;
        letter-spacing: 3px;
        text-transform: uppercase;
        font-weight: 600;
    }
    
    /* Sidebar Styling */
    [data-testid="stSidebar"] {
        background: rgba(10, 10, 25, 0.6) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-right: 1px solid rgba(0, 242, 254, 0.2);
    }
    
    [data-testid="stSidebar"] * {
        color: #c0c0e0;
    }
    
    /* Inputs */
    .stSelectbox label, .stTextArea label {
        color: #00f2fe !important;
        font-weight: 600;
        font-size: 1.2rem;
        letter-spacing: 1px;
    }
    
    .stSelectbox div[data-baseweb="select"] > div, 
    .stTextArea textarea {
        background: rgba(20, 20, 40, 0.8) !important;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(112, 0, 255, 0.4) !important;
        border-radius: 10px;
        padding: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    /* Force visibility of selected text and options */
    .stSelectbox div[data-baseweb="select"] * {
        color: #ffffff !important;
    }
    
    .stTextArea textarea {
        color: #ffffff !important;
    }
    
    /* Dropdown Options List styling */
    div[role="listbox"] {
        background-color: #050510 !important;
        border: 1px solid rgba(0, 242, 254, 0.4) !important;
        border-radius: 8px;
    }
    div[role="listbox"] ul li {
        color: #ffffff !important;
        background-color: transparent !important;
    }
    div[role="listbox"] ul li:hover {
        background-color: rgba(0, 242, 254, 0.2) !important;
    }
    
    .stSelectbox div[data-baseweb="select"] > div:focus-within, 
    .stTextArea textarea:focus {
        border-color: #00f2fe !important;
        box-shadow: 0 0 15px rgba(0, 242, 254, 0.4);
    }
    
    /* Neon Button */
    .stButton > button {
        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        color: #050510;
        border: none;
        border-radius: 8px;
        padding: 0.8rem 2rem;
        font-size: 1.3rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(0, 242, 254, 0.5);
        width: 100%;
        margin-top: 25px;
        margin-bottom: 30px;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(0, 242, 254, 0.8);
        color: #000;
        border: none;
    }
    
    /* Red Terminal Box */
    .terminal-box {
        background-color: rgba(20, 0, 0, 0.8);
        border: 1px solid #ff3333;
        border-left: 5px solid #ff3333;
        color: #ff6666;
        font-family: 'Courier New', Courier, monospace;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(255, 51, 51, 0.3);
    }
    
    /* Certificate Box */
    .certificate-box {
        background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.15) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 215, 0, 0.5);
        color: #ffd700;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.2);
        margin-top: 20px;
        margin-bottom: 20px;
    }
    
    /* Metric / Gauge rough styling */
    div[data-testid="stMetricValue"] {
        color: #00f2fe;
        font-size: 5rem !important;
        font-weight: 900;
        text-shadow: 0 0 20px rgba(0, 242, 254, 0.6);
        text-align: center;
    }
    div[data-testid="stMetricLabel"] {
        color: #a0a0c0;
        text-align: center;
        font-size: 1.5rem !important;
        text-transform: uppercase;
        letter-spacing: 2px;
    }
    
    /* Feedback container */
    .feedback-glass {
        background: rgba(30, 10, 40, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(112, 0, 255, 0.6);
        border-radius: 12px;
        padding: 25px;
        color: #f093fb;
        box-shadow: 0 8px 32px rgba(112, 0, 255, 0.2);
        font-size: 1.1rem;
        line-height: 1.6;
        height: 100%;
    }

    /* General glass card for analogies/assumptions */
    .glass-card {
        background: rgba(20, 20, 40, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 242, 254, 0.4);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        margin-top: 20px;
        box-shadow: 0 8px 32px rgba(0, 242, 254, 0.1);
    }
</style>
""", unsafe_allow_html=True)

# Inject interactive ANN background
components.html("""
<script>
    const parentDoc = window.parent.document;
    if (!parentDoc.getElementById('annCanvas')) {
        const canvas = parentDoc.createElement('canvas');
        canvas.id = 'annCanvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '-1';
        canvas.style.backgroundColor = '#050510';
        parentDoc.body.prepend(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particles = [];
        const numParticles = 80;
        let mouse = { x: -1000, y: -1000 };

        parentDoc.addEventListener('mousemove', function(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        parentDoc.addEventListener('mouseout', function(e) {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                this.radius = Math.random() * 2 + 1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 242, 254, ${1 - distance/150})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                    ctx.closePath();
                    // Connect and shift
                    this.x -= dx * 0.01;
                    this.y -= dy * 0.01;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#7000ff';
                ctx.fill();
                ctx.closePath();
            }
        }

        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i; j < particles.length; j++) {
                    let dx = particles[i].x - particles[j].x;
                    let dy = particles[i].y - particles[j].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(112, 0, 255, ${0.4 - distance/300})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.closePath();
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();

        window.addEventListener('resize', function() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
</script>
""", height=0, width=0)

# ---> Sidebar content
with st.sidebar:
    st.markdown("<h2 style='color: #00f2fe; text-align: center; text-transform: uppercase; letter-spacing: 2px;'>Cognitive Verification Loop</h2>", unsafe_allow_html=True)
    st.markdown("""
    <div style='background: rgba(20,20,40,0.5); padding: 20px; border-radius: 10px; border: 1px solid rgba(0,242,254,0.3); margin-top: 20px;'>
        <p style='margin-bottom: 15px;'><strong>1. Initiation</strong><br> <span style='color: #8b949e;'>Provide your reasoning for a specific domain.</span></p>
        <p style='margin-bottom: 15px;'><strong>2. Interrogation</strong><br> <span style='color: #8b949e;'>Tark audits the logic for hidden, dangerous premises.</span></p>
        <p style='margin-bottom: 15px;'><strong>3. Scaling</strong><br> 
        <span style='color: #8b949e;'><i>Novice:</i> Receives Real-World Analogies.</span><br>
        <span style='color: #8b949e;'><i>Expert:</i> Receives Red Team optimization challenges.</span></p>
        <p style='margin-bottom: 15px;'><strong>4. Failure-First Protocol</strong><br> <span style='color: #8b949e;'>Flawed logic triggers a Virtual System Crash simulation rather than a generic error message.</span></p>
        <p style='margin-bottom: 0px;'><strong>5. Proof of Thought</strong><br> <span style='color: #8b949e;'>Achieving a perfect score (100) mints a unique cryptographic POT hash.</span></p>
    </div>
    """, unsafe_allow_html=True)
    
    with st.expander("System Architecture", expanded=True):
        st.markdown("""
        ```mermaid
        graph TD
            A[Input & Scan] --> B(The Gatekeeper)
            B --> C{Failure Simulation}
            C -- If Fail --> D[Virtual System Crash]
            B --> E{The Crucible}
            E -- If Pass 100 --> F[Proof of Thought]
        ```
        """)

# ---> Main UI
st.markdown("<div class='title-h1'>TARK</div>", unsafe_allow_html=True)
st.markdown("<div class='subtitle'>STOP MEMORIZING, START REASONING</div>", unsafe_allow_html=True)

# Input container
domain_options = ["🚀 Coding", "📚 Studies", "🏦 Banking Advice Logic Helper"]
domain = st.selectbox("Select Domain:", domain_options, index=None, placeholder="Choose your verification domain...")

st.markdown("<br>", unsafe_allow_html=True)

if not domain:
    st.warning("⚠️ No domain selected. Please choose a domain before proceeding.", icon="⚠️")
else:
    # Explicitly highlight the chosen domain above the chat/input area
    st.header(f'Active Domain: {domain}')

# Initialize Chat History
if "messages" not in st.session_state:
    st.session_state["messages"] = []

# Display previous chat history
for msg in st.session_state["messages"]:
    role = msg["role"]
    content = msg["content"]
    
    if role == "user":
        with st.chat_message("user", avatar="👤"):
            st.markdown(f"**Domain:** {msg.get('domain', 'Unknown')}<br><br>{content}", unsafe_allow_html=True)
    elif role == "assistant":
        with st.chat_message("assistant", avatar="🛡️"):
            result = msg.get("result", {})
            st.markdown("<br><hr style='border-color: rgba(0, 242, 254, 0.3);'><br>", unsafe_allow_html=True)
            st.markdown("<h2 style='text-align: center; color: #fff; letter-spacing: 2px; margin-bottom: 30px;'>AUDIT RESULTS</h2>", unsafe_allow_html=True)
            
            # Columns for Results
            col1, col2 = st.columns([1, 2], gap="large")
            score = result.get('logic_score', 0)
            
            with col1:
                st.metric("SCORE", f"{score}")
            with col2:
                st.markdown(f"<div class='feedback-glass'><strong>FEEDBACK:</strong><br><br>{result.get('feedback', '')}</div>", unsafe_allow_html=True)
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            if score < 85 and 'simulation' in result:
                st.markdown(f"""
                <br>
                <div class='terminal-box'>
                    <strong style='font-size: 1.2rem;'>[CRITICAL FAILURE] VIRTUAL SYSTEM CRASH</strong><br><br>
                    > {result['simulation']}
                </div>
                """, unsafe_allow_html=True)
                
            if 'analogy' in result:
                st.markdown(f"""
                <div class='glass-card' style='border-color: rgba(63, 185, 80, 0.4); box-shadow: 0 8px 32px rgba(63, 185, 80, 0.1);'>
                    <strong style='color: #56d364; font-size: 1.1rem;'>💡 REAL-WORLD ANALOGY:</strong><br><br>
                    <span style='color: #e6edf3;'>{result['analogy']}</span>
                </div>
                """, unsafe_allow_html=True)
                
            if 'assumptions' in result and isinstance(result['assumptions'], list) and len(result['assumptions']) > 0:
                assumptions_html = "".join([f"<li style='margin-bottom: 8px;'>{a}</li>" for a in result['assumptions']])
                st.markdown(f"""
                <div class='glass-card' style='border-color: rgba(240, 136, 62, 0.4); box-shadow: 0 8px 32px rgba(240, 136, 62, 0.1);'>
                    <strong style='color: #f0883e; font-size: 1.1rem;'>⚠️ DETECTED ASSUMPTIONS:</strong><br><br>
                    <ul style='color: #e6edf3;'>
                        {assumptions_html}
                    </ul>
                </div>
                """, unsafe_allow_html=True)
                    
            if score == 100 and 'pot_hash' in result:
                st.markdown(f"""
                <div class='certificate-box'>
                    <h2 style='color: #ffd700; margin-top: 0; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);'>🏆 PROOF OF THOUGHT CERTIFICATE</h2>
                    <p style='font-size: 1.2rem; margin-bottom: 20px;'>Perfect Logic Sequence Verified</p>
                    <code style='background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 5px; font-size: 1.1rem; color: #00ff00;'>HASH: {result['pot_hash']}</code>
                </div>
                """, unsafe_allow_html=True)

# Chat input container
if prompt := st.chat_input("Input your reasoning sequence here for rigorous auditing..."):
    if not domain:
        st.error("⚠️ No domain selected! Please choose a domain from the dropdown above before verifying.", icon="⚠️")
    else:
        # 1. Store and display user message
        st.session_state["messages"].append({"role": "user", "content": prompt, "domain": domain})
        with st.chat_message("user", avatar="👤"):
            st.markdown(f"**Domain:** {domain}<br><br>{prompt}", unsafe_allow_html=True)
            
        # 2. Evaluate and store Tark's response
        with st.chat_message("assistant", avatar="🛡️"):
            with st.spinner("TARK AUDIT IN PROGRESS..."):
                try:
                    # evaluate_logic now returns a parsed dict directly
                    result = evaluate_logic(prompt, domain)
                    
                    if isinstance(result, dict) and 'logic_score' in result and 'feedback' in result:
                        st.session_state["messages"].append({"role": "assistant", "content": "Evaluation complete.", "result": result})
                        st.rerun() # Refresh to natively render via the history loop
                    else:
                        st.error("Invalid response format. The model did not return the expected JSON keys.")
                        with st.expander("Raw Response / Dictionary"):
                            st.write(result)
                            
                except Exception as e:
                    st.error(f"SYSTEM ERROR: {str(e)}")
