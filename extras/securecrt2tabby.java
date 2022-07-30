
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.List;

public class securecrt2tabby {

    public static boolean convFile(List<String> res, String fn, String ses, String grp) throws Exception {
        if (grp.length() > 0) {
            grp = grp.substring(1, grp.length());
        } else {
            grp = null;
        }
        BufferedReader reader = new BufferedReader(new FileReader(fn));
        String prt = null;
        String por = null;
        String hst = null;
        String usr = null;
        for (;;) {
            String a = reader.readLine();
            if (a == null) {
                break;
            }
            int i = a.indexOf("=");
            if (i < 0) {
                continue;
            }
            String s = a.substring(i + 1, a.length()).trim();
            a = a.substring(0, i).trim();
            a = a.replaceAll("\"", "").toLowerCase();
            if (a.equals("s:protocol name")) {
                prt = s;
                continue;
            }
            if (a.equals("s:hostname")) {
                hst = s;
                continue;
            }
            if (a.equals("s:username")) {
                usr = s;
                continue;
            }
            if (a.equals("d:port")) {
                por = s;
                continue;
            }
        }
        reader.close();
        if (prt == null) {
            return true;
        }
        if (hst == null) {
            return true;
        }
        if (usr == null) {
            return true;
        }
        if (por != null) {
            por = "" + Integer.parseInt(por, 16);
        }
        prt = prt.toLowerCase();
        System.out.println(fn + " " + grp + " " + ses + " " + prt + " " + hst + " " + usr + " " + por);
        if (prt.equals("telnet")) {
            res.add("  - name: " + ses);
            res.add("    options:");
            res.add("      host: " + hst);
            if (por != null) {
                res.add("      port: " + por);
            }
            res.add("    type: telnet");
            if (grp != null) {
                res.add("    group: " + grp);
            }
            return false;
        }
        if (prt.equals("ssh2")) {
            res.add("  - name: " + ses);
            res.add("    options:");
            res.add("      host: " + hst);
            if (por != null) {
                res.add("      port: " + por);
            }
            res.add("    type: ssh");
            if (grp != null) {
                res.add("    group: " + grp);
            }
            res.add("    disableDynamicTitle: true");
            return false;
        }
        return false;
    }

    public static void convDir(List<String> res, String fn, String grp) throws Exception {
        File[] fl = new File(fn).listFiles();
        for (int i = 0; i < fl.length; i++) {
            File f = fl[i];
            String a = f.getName();
            if (f.isDirectory()) {
                convDir(res, fn + a + "/", grp + "-" + a);
                continue;
            }
            if (!f.isFile()) {
                continue;
            }
            int o = a.lastIndexOf(".");
            if (o < 0) {
                continue;
            }
            if (convFile(res, fn + a, a.substring(0, o), grp)) {
                System.err.println("unable to convert " + a);
                continue;
            }
        }

    }

    public static void main(String[] args) throws Exception {
        if (args.length<2){
            System.err.println("usage: java scrt2tabby <sessionDir> <outfile>");
            return;
        }
        List<String> res = new ArrayList<String>();
        res.add("profiles:");
        convDir(res, args[0], "");
        PrintStream pr = new PrintStream(new FileOutputStream(args[1]));
        for (int i = 0; i < res.size(); i++) {
            pr.println(res.get(i));
        }
        pr.close();
    }

}
