import { redirect } from "next/navigation";

export default function Page() {
  const link =
    "https://drive.google.com/drive/folders/1Beobo5-Qe79ec_w4Zz8U9CSqISAHsAJF?usp=sharing";
  redirect(link);
}
