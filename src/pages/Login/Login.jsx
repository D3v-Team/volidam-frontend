import {
    Box,
    Flex,
    Heading,
    Text,
    Input,
    Button,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Link,
    InputGroup,
    InputLeftElement,
    InputRightElement,
    VStack,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Auth } from "../../Services/api/Auth";
import { useAuth } from "../../hooks/useAuth";
import { toastService } from "../../utils/toast";
import { useNavigate } from "react-router";
import { isAdmin, isOperator, isSuperAdmin } from "../../utils/roles";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const passInput = useRef("");
    const logInput = useRef("");
    const [errors, setErrors] = useState({ login: "", password: "" });

    const clearError = (field) => {
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loginText = logInput.current.value.trim();
        const password = passInput.current.value.trim();

        let newErrors = {};
        if (!loginText) newErrors.login = "Login kiritilmadi";
        if (!password) newErrors.password = "Parol kiritilmadi";
        else if (password.length < 6) newErrors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            setLoading(true);
            const res = await Auth.Login({
                username: logInput.current.value,
                password: passInput.current.value,
            });

            if (res.status === 200 || res.status === 201) {
                const data = res.data;
                login({
                    token: data.tokens.access_token,
                    refreshToken: data.tokens.refresh_token,
                    user: data.user,
                });

                if (isSuperAdmin(data.user.role)) {
                    navigate("/superadmin");
                    toastService.success("Xush kelibsiz, Super Admin!");
                } else if (isAdmin(data.user.role)) {
                    navigate("/admin/leads");
                    toastService.success("Muvaffaqiyatli kirdingiz, Admin!");
                } else if (isOperator(data.user.role)) {
                    navigate("/operator/leads");
                    toastService.success("Muvaffaqiyatli kirdingiz, Operator!");
                } else {
                    toastService.error("Role mos kelmadi");
                }
            }
        } catch (err) {
            toastService.error(err?.response?.data?.message || "Tizim xatosi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

              .login-bg {
    background: linear-gradient(145deg, #fff5f5 0%, #fff0f0 35%, #ffcaca 65%, #fff0f0 85%, #fff5f5 100%) !important;
}

                .login-bg::before {
                    content: "❀  ✿  ❁  ✾  ❀  ✿  ❁";
                    position: fixed;
                    top: 5%;
                    left: 0; right: 0;
                    text-align: center;
                    font-size: 1.1rem;
                    color: #f48fb1;
                    opacity: 0.28;
                    letter-spacing: 2.2rem;
                    pointer-events: none;
                    z-index: 0;
                }

                .login-bg::after {
                    content: "✿  ❁  ✾  ❀  ✿  ❁  ✾";
                    position: fixed;
                    bottom: 5%;
                    left: 0; right: 0;
                    text-align: center;
                    font-size: 1.1rem;
                    color: #f48fb1;
                    opacity: 0.28;
                    letter-spacing: 2.2rem;
                    pointer-events: none;
                    z-index: 0;
                }

                .login-card {
                    background: rgba(255, 255, 255, 0.70) !important;
                    backdrop-filter: blur(22px) !important;
                    -webkit-backdrop-filter: blur(22px) !important;
                    border: 1px solid rgba(244, 143, 177, 0.35) !important;
                    box-shadow: 0 8px 40px rgba(233,30,99,0.09), 0 2px 12px rgba(233,30,99,0.05), inset 0 1px 0 rgba(255,255,255,0.88) !important;
                    position: relative;
                    overflow: hidden;
                }

                .login-card::before {
                    content: '';
                    position: absolute;
                    top: -70px; right: -70px;
                    width: 200px; height: 200px;
                    background: radial-gradient(circle, rgba(252,228,236,0.65) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 0;
                }

                .login-card::after {
                    content: '';
                    position: absolute;
                    bottom: -60px; left: -60px;
                    width: 180px; height: 180px;
                    background: radial-gradient(circle, rgba(248,187,208,0.5) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 0;
                }

                .login-title {
                    font-family: 'Cormorant Garamond', serif !important;
                    letter-spacing: 0.01em !important;
                }

                .login-label {
                    font-family: 'DM Sans', sans-serif !important;
                    font-size: 0.78rem !important;
                    font-weight: 500 !important;
                    letter-spacing: 0.07em !important;
                    text-transform: uppercase !important;
                    color: #ad1457 !important;
                    margin-bottom: 0.45rem !important;
                }

                .login-input {
                    font-family: 'DM Sans', sans-serif !important;
                    border-radius: 14px !important;
                    border: 1.5px solid rgba(244,143,177,0.4) !important;
                    background: rgba(255,255,255,0.65) !important;
                    color: #880e4f !important;
                    height: 50px !important;
                    font-size: 0.95rem !important;
                    transition: all 0.25s ease !important;
                }

                .login-input::placeholder {
                    color: #f48fb1 !important;
                    opacity: 0.75 !important;
                }

                .login-input:hover {
                    border-color: rgba(233,30,99,0.5) !important;
                    background: rgba(255,255,255,0.82) !important;
                }

                .login-input:focus {
                    border-color: #e91e63 !important;
                    background: rgba(255,255,255,0.94) !important;
                    box-shadow: 0 0 0 3px rgba(233,30,99,0.13) !important;
                }

                .login-input[aria-invalid="true"] {
                    border-color: #e91e63 !important;
                    box-shadow: 0 0 0 3px rgba(233,30,99,0.10) !important;
                }

                .login-error {
                    font-family: 'DM Sans', sans-serif !important;
                    font-size: 0.78rem !important;
                    color: #c2185b !important;
                }

                .login-btn {
                    font-family: 'DM Sans', sans-serif !important;
                    border-radius: 25px !important;
                    height: 52px !important;
                    background: linear-gradient(135deg, #e91e63 0%, #c2185b 50%, #ad1457 100%) !important;
                    color: #fff !important;
                    font-weight: 500 !important;
                    font-size: 0.88rem !important;
                    letter-spacing: 0.1em !important;
                    text-transform: uppercase !important;
                    border: none !important;
                    box-shadow: 0 6px 24px rgba(233,30,99,0.32), 0 2px 8px rgba(233,30,99,0.18) !important;
                    transition: all 0.28s ease !important;
                    position: relative;
                    overflow: hidden;
                }

                .login-btn:hover:not(:disabled) {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 32px rgba(233,30,99,0.40), 0 4px 12px rgba(233,30,99,0.22) !important;
                    background: linear-gradient(135deg, #ec407a 0%, #e91e63 50%, #c2185b 100%) !important;
                }

                .login-btn:active:not(:disabled) {
                    transform: translateY(0px) !important;
                }

                .login-btn::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -65%;
                    width: 40%; height: 200%;
                    background: rgba(255,255,255,0.16);
                    transform: skewX(-20deg);
                    transition: left 0.5s ease;
                    pointer-events: none;
                }

                .login-btn:hover::after {
                    left: 130%;
                }

                .login-forgot-link {
                    font-family: 'DM Sans', sans-serif !important;
                    font-size: 0.8rem !important;
                    color: #ad1457 !important;
                    opacity: 0.7 !important;
                    text-decoration: none !important;
                    border-bottom: 1px dashed rgba(173,20,87,0.35) !important;
                    padding-bottom: 1px !important;
                    transition: opacity 0.2s !important;
                }

                .login-forgot-link:hover {
                    opacity: 1 !important;
                    text-decoration: none !important;
                }

                .login-register-link {
                    font-family: 'DM Sans', sans-serif !important;
                    color: #e91e63 !important;
                    font-weight: 500 !important;
                    border-bottom: 1px dashed rgba(233,30,99,0.4) !important;
                    padding-bottom: 1px !important;
                    cursor: pointer !important;
                    text-decoration: none !important;
                    transition: opacity 0.2s !important;
                }

                .login-register-link:hover {
                    opacity: 0.7 !important;
                    text-decoration: none !important;
                }

                .login-divider {
                    width: 52px;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #f48fb1, transparent);
                    border-radius: 2px;
                    margin: 0 auto;
                }

                .eye-btn {
                    background: none !important;
                    border: none !important;
                    color: #f48fb1 !important;
                    font-size: 1.1rem !important;
                    cursor: pointer !important;
                    padding: 0 10px !important;
                    height: 50px !important;
                    display: flex !important;
                    align-items: center !important;
                    transition: color 0.2s !important;
                    outline: none !important;
                }

                .eye-btn:hover {
                    color: #e91e63 !important;
                }
            `}</style>

            <Flex
                className="login-bg"
                minH="100vh"
                align="center"
                justify="center"
                px={4}
                position="relative"
            >
                <Box
                    as="form"
                    onSubmit={handleSubmit}
                    className="login-card"
                    w={{ base: "100%", sm: "440px" }}
                    borderRadius="28px"
                    p={{ base: "2rem 1.6rem", sm: "3rem 2.8rem 2.5rem" }}
                    position="relative"
                    zIndex={1}
                >
                  
<Flex justify="center" mb={3} position="relative" zIndex={1}>
    <Box
        w="100px" h="100px"
        borderRadius="full"
        bg="#CC0000"
        border="3px solid white"
        boxShadow="0 4px 16px rgba(180,0,0,0.30)"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
    >
        <Text
            fontFamily="'DM Sans', sans-serif"
            fontWeight="700"
            fontSize="14px"
            color="white"
            letterSpacing="0.12em"
            lineHeight="1"
        >
            VOLIDAM
        </Text>
        <Text
            fontFamily="'Cormorant Garamond', serif"
            fontStyle="italic"
            fontSize="10px"
            color="rgba(255,255,255,0.88)"
            letterSpacing="0.04em"
            textAlign="center"
            lineHeight="1.3"
        >
            o'quv markazi
        </Text>
    </Box>
</Flex>


                    <Heading
                        className="login-title"
                        textAlign="center"
                        fontSize="2.1rem"
                        fontWeight={500}
                        color="#880e4f"
                        mb={2}
                        position="relative"
                        zIndex={1}
                    >
                        Kirish
                    </Heading>

                    <Box className="login-divider" my={3} position="relative" zIndex={1} />

                    <Text
                        textAlign="center"
                        fontSize="0.99rem"
                        fontFamily="'DM Sans', sans-serif"
                        fontWeight={300}
                        color="#c2185b"
                        opacity={0.72}
                        mb={7}
                        mt={3}
                        letterSpacing="0.02em"
                        position="relative"
                        zIndex={1}
                    >
                        Tizimga kirish uchun ma'lumotlarni kiriting
                    </Text>

                    <VStack spacing={5} position="relative" zIndex={1}>
                        <FormControl isInvalid={!!errors.login}>
                            <FormLabel className="login-label">Login</FormLabel>
                            <InputGroup>
                              
                                <Input
                                    ref={logInput}
                                    className="login-input"
                                    placeholder="Loginni kiriting"
                                    onChange={() => clearError("login")}
                                />
                            </InputGroup>
                            <FormErrorMessage className="login-error">
                                ✦ {errors.login}
                            </FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.password}>
                            <FormLabel className="login-label">Parol</FormLabel>
                            <InputGroup>
                               
                                <Input
                                    ref={passInput}
                                    className="login-input"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Parolni kiriting"
                                    onChange={() => clearError("password")}
                                />
                                <InputRightElement h="50px">
                                    <button
                                        type="button"
                                        className="eye-btn"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                                    >
                                    </button>
                                </InputRightElement>
                            </InputGroup>
                            <FormErrorMessage className="login-error">
                                ✦ {errors.password}
                            </FormErrorMessage>
                        </FormControl>
                    </VStack>

                    <Flex justify="flex-end" mt={2} mb={1} position="relative" zIndex={1}>
                        <Link className="login-forgot-link" href="#">
                            Parolni unutdingizmi?
                        </Link>
                    </Flex>

                    <Button
                        type="submit"
                        className="login-btn"
                        w="100%"
                        mt={5}
                        mb={4}
                        isLoading={loading}
                        loadingText="Yuklanmoqda..."
                        position="relative"
                        zIndex={1}
                    >
                        ✦ Kirish ✦
                    </Button>

                    {/* <Text
                        textAlign="center"
                        fontSize="0.99rem"
                        fontFamily="'DM Sans', sans-serif"
                        color="#c2185b"
                        opacity={0.75}
                        position="relative"
                        zIndex={1}
                    >
                        Hisobingiz yo'qmi?{" "}
                        <Link
                            className="login-register-link"
                            onClick={() => navigate("/register")}
                        >
                            Ro'yxatdan o'tish
                        </Link>
                    </Text> */}
                </Box>
            </Flex>
        </>
    );
}