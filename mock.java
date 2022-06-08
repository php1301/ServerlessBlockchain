package com.example.doanmobile.activity;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.util.Log;
import android.view.View;

import com.example.doanmobile.R;
import com.example.doanmobile.databinding.ActivityLoginBinding;

import org.walletconnect.Session;

import java.sql.Array;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import dev.pinkroom.walletconnectkit.WalletConnectKit;
import dev.pinkroom.walletconnectkit.WalletConnectKitConfig;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;

public class LoginActivity extends AppCompatActivity implements Session.Callback {

    ActivityLoginBinding binding;
    WalletConnectKit walletConnectKit;
    Session session;
    @Override
    public void onStatus(Session.Status status){
        System.out.println(status.toString());

    }

    @Override
    public void onMethodCall(Session.MethodCall methodCall){
        System.out.println(methodCall.toString());
    }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityLoginBinding.inflate(getLayoutInflater());

        setContentView(binding.getRoot());

        setTheme(R.style.Theme_DoAnMobile);

        List<String> list = Arrays.asList("haha");

        WalletConnectKitConfig config = new WalletConnectKitConfig(
                LoginActivity.this,
                "https://bridge.walletconnect.org",
                "https://blockchain-charity.vercel.app/",
                "WalletConnectKit",
                "abc",
                list
        );
        walletConnectKit = new WalletConnectKit.Builder(config).build();
        binding.btnLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
//                Intent intent = new Intent(LoginActivity.this, MainActivity.class);
//                startActivity(intent);
                binding.btnLogin.start(walletConnectKit, address -> {
//                        session = walletConnectKit.getSession();
                    //                        walletConnectKit.getSession().performMethodCall(new Session
//                                .MethodCall
//                                .Custom(System.currentTimeMillis(),
//                                "personal_sign", params), response -> {
//                            System.out.println(response.toString());
//                            return Unit.INSTANCE;
//                        });


//                    walletConnectKit.personalSign("123", new Continuation<Session.MethodCall.Response>() {
//                                    @NonNull
//                                    @Override
//                                    public CoroutineContext getContext() {
//                                        return EmptyCoroutineContext.INSTANCE;
//                                    }
//
//                                    @Override
//                                    public void resumeWith(@NonNull Object o) {
//                                        System.out.println(o.toString());
//                                    }
//                                });
                    System.out.println("You are connected with account: " + address);
                    return Unit.INSTANCE;
                });

                //                    walletConnectKit.createSession(new Session.Callback() {
//                        @Override
//                        public void onStatus(@NonNull Session.Status status) {
//                            if(status == Session.Status.Connected.INSTANCE){
//
//
//
//                            }
//                            else{
//                                binding.btnLogin.start(walletConnectKit, address -> {
//                                    System.out.println("You are connected with account: " + address);
//                                    return Unit.INSTANCE;
//                                });
//                            }
//                        }

//                        @Override
//                        public void onMethodCall(@NonNull Session.MethodCall methodCall) {
//
//                        }
//                    });
                if(session != null) {
                    String data = "0xcd7a489e00000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000000000000b546573742061626364656600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000036767670000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002068747470733a2f2f692e696d6775722e636f6d2f79723274597a6f2e6a7065670000000000000000000000000000000000000000000000000000000000000018323032322d30362d30325430323a32383a35312e3337315a00000000000000000000000000000000000000000000000000000000000000000000000000000018323032322d30362d30325430323a32383a35312e3337315a0000000000000000";
                    walletConnectKit.getSession().performMethodCall(new Session
                            .MethodCall
                            .SendTransaction(System.currentTimeMillis(), "0x4ddFf5E113FF403f193503c280DDf7723E53Ca11", "0xE124cEE21A6DE685D24AaC6487CC9AAB07350A38", "abc", "0x8a8c7838", "0x2b89ee", "0x0", data), response -> {

                        System.out.println(response.toString());
                        return Unit.INSTANCE;
                    });
                }
            }
        });

      walletConnectKit.performTransaction("0xE124cEE21A6DE685D24AaC6487CC9AAB07350A38", "0", data,"2",  null, null, new Continuation<Session.MethodCall.Response>() {
                    @NonNull
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }

                    @Override
                    public void resumeWith(@NonNull Object o) {
//                        System.out.println(o.toString());
                    }
                });
    }
    protected  void onStart() {
        super.onStart();
    }
}